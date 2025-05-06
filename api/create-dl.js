import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { groupName, groupEmail, members } = req.body;

  if (!groupName || !groupEmail || !members) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const emails = members.split(",").map((e) => e.trim());

  try {
    // Get token
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const token = tokenRes.data.access_token;

    // Create group
    const groupRes = await axios.post(
      `https://graph.microsoft.com/v1.0/groups`,
      {
        displayName: groupName,
        mailEnabled: true,
        mailNickname: groupEmail.split("@")[0],
        securityEnabled: false,
        groupTypes: ["Unified"],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const groupId = groupRes.data.id;
    const groupMail = groupRes.data.mail;
    const results = [];

    for (const email of emails) {
      try {
        const user = await axios.get(
          `https://graph.microsoft.com/v1.0/users/${email}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const userId = user.data.id;

        await axios.post(
          `https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref`,
          {
            "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        results.push({ email, status: "added" });
      } catch (e) {
        results.push({ email, status: "failed", error: e.message });
      }
    }

    res.json({
      message: "DL created and users processed.",
      groupId,
      groupEmail: groupMail,
      results,
    });
  } catch (err) {
    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
}