export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://openrelay.metered.ca/api/v1/turn/credentials",
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENRELAY_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch TURN creds: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data); // { iceServers: [...] }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not get TURN credentials" });
  }
}
