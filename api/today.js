import Parser from "rss-parser";

export default async function handler(req, res) {
  try {
    const parser = new Parser({
      customFields: {
        item: [
          ["itunes:summary", "itunesSummary"],
          ["itunes:subtitle", "itunesSubtitle"],
          ["itunes:author", "itunesAuthor"],
          ["itunes:duration", "itunesDuration"],
          ["itunes:image", "itunesImage", { keepArray: false }],
          ["itunes:keywords", "itunesKeywords"],
          ["author", "author"]
        ]
      }
    });

    // 1. FETCH USCCB FEED
    const feed = await parser.parseURL(
      "https://feeds.feedburner.com/usccb/zhqs"
    );

// 2. TODAY based on browser timezone
const tz = req.query.tz || "UTC";

const now = new Date();

const todayString = now.toLocaleDateString("en-US", {
  timeZone: tz,
  year: "numeric",
  month: "long",
  day: "numeric"
});

// DEBUG LOGS
console.log("---- USCCB FEED DATE DEBUG ----");
console.log("Server UTC now:", new Date().toUTCString());
console.log("Browser timezone:", tz);
console.log("Local-time computed date:", todayString);
console.log("--------------------------------");


    // 3. Extract date from text like:
    // "Daily Mass Reading Podcast for March 30, 2026"
    function extractDate(text) {
      const match = text.match(/for ([A-Za-z]+ \d{1,2}, \d{4})/);
      return match ? match[1] : null;
    }

    // 4. FIND ALL ITEMS FOR TODAY
    const todaysItems = feed.items.filter(item => {
      const text =
        item.title ||
        item.itunesSummary ||
        item.description ||
        "";
      const extracted = extractDate(text);
      return extracted === todayString;
    });

    // 5. IF NO MATCH → RETURN EMPTY RSS
    if (todaysItems.length === 0) {
      const emptyRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>No Items Today</title>
    <description>No USCCB items found for ${todayString}</description>
  </channel>
</rss>`;
      res.setHeader("Content-Type", "application/xml");
      return res.status(200).send(emptyRSS);
    }

    // 6. BUILD MULTIPLE <item> BLOCKS
    const itemsXML = todaysItems
      .map(item => {
        return `
    <item>
      <guid isPermaLink="false">${item.guid}</guid>
      <title>${item.title}</title>
      <pubDate>${item.pubDate}</pubDate>
      <link>${item.link}</link>
      <itunes:duration>${item.itunesDuration || ""}</itunes:duration>
      <itunes:author>${item.itunesAuthor || ""}</itunes:author>
      <itunes:explicit>no</itunes:explicit>
      <itunes:summary>${item.itunesSummary || ""}</itunes:summary>
      <itunes:subtitle>${item.itunesSubtitle || ""}</itunes:subtitle>
      <description><![CDATA[${item.description || ""}]]></description>
      <enclosure type="audio/mpeg"
                 url="${item.enclosure?.url || ""}"
                 length="${item.enclosure?.length || ""}"/>
      <itunes:image href="${item.itunesImage?.href || ""}"/>
      <author>${item.author || ""}</author>
      <itunes:keywords>${item.itunesKeywords || ""}</itunes:keywords>
    </item>`;
      })
      .join("\n");

    // 7. BUILD FULL RSS FEED WITH YOUR CUSTOM CHANNEL HEADER
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     version="2.0">

  <channel>

    <atom:link href="https://feeds.soundcloud.com/users/soundcloud:users:838970026/sounds.rss" rel="self" type="application/rss+xml"/>
    <atom:link href="https://feeds.soundcloud.com/users/soundcloud:users:838970026/sounds.rss?before=1961977543" rel="next" type="application/rss+xml"/>

    <title>Daily Readings from the New American Bible</title>
    <link>https://soundcloud.com/usccb-readings</link>
    <pubDate>${feed.pubDate}</pubDate>
    <lastBuildDate>${feed.lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
    <language>en</language>
    <copyright>(c) New American Bible. All Rights Reserved.</copyright>
    <webMaster>feeds@soundcloud.com (SoundCloud Feeds)</webMaster>
    <description>Readings from the official New American Bible and Vatican approved for use in U.S. Catholic parishes.</description>

    <itunes:subtitle>The Daily Mass Readings based on the New American Bible and approved for use in the United States of America.</itunes:subtitle>
    <itunes:author>Catholic Communication Campaign</itunes:author>
    <itunes:explicit>no</itunes:explicit>

    <itunes:image href="http://ccc.usccb.org/cccradio/NABPodcasts/nablogo.jpg"/>

    <image>
      <url>https://i1.sndcdn.com/avatars-F7uWi4zgj3w8cbsb-xZlEUg-original.jpg</url>
      <title>USCCB Daily Readings</title>
      <link>https://soundcloud.com/usccb-readings</link>
    </image>

    <itunes:keywords>Daily,Readings,USCCB,New,American,Bible,Catholic,Catholicism,Psalms,Catechism</itunes:keywords>
    <itunes:summary>The Daily Mass Readings based on the New American Bible and approved for use in the United States of America.</itunes:summary>

    <itunes:category text="Religion  &amp; Spirituality">
      <itunes:category text="Christianity"/>
    </itunes:category>

    <itunes:owner>
      <itunes:email>nab@usccb.org</itunes:email>
      <itunes:name>Catholic Communication Campaign</itunes:name>
    </itunes:owner>

${itemsXML}

  </channel>
</rss>`;

    // 8. RETURN XML
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(xml);

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch or process USCCB feed",
      details: error.message
    });
  }
}
