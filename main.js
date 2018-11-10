const fetch = require('node-fetch');
const Json2csvParser = require('json2csv').Parser;

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const { BigQuery } = require('@google-cloud/bigquery');
const bigquery = new BigQuery();
const fields = ['name', 'max_temperature', 'latitude', 'longitude', 'dist_kms']
const latitude = -6.224530
const longitude = 106.914670

const bucketName = 'BUCKET_NAME'
const slackNotificationURL = "SLACK_WEBHOOK_URL"
const secret = "GENERATE_YOUR_OWN_SECRET_KEY"

exports.dailyReportNotification = async (req, res) => {
    if (req.query.secret !== secret) {
        res.status(403).send("Unauthorized Access")
        return
    }

    try {
        const date = new Date()
        date.setDate(date.getDate() - 7);
        const year = date.getFullYear()
        const month = (date.getMonth() + 1) < 10 ? `0${date.getMonth() + 1}` : `${date.getMonth() + 1}`
        const day = (date.getDate()) < 10 ? `0${date.getDate()}` : `${date.getDate()})`;

        const sqlQuery = `
        SELECT
            name,
            value/10 AS max_temperature,
            latitude,
            longitude,
            DEGREES(ACOS(SIN(RADIANS(latitude)) * SIN(RADIANS(${latitude})) + COS(RADIANS(latitude)) * COS(RADIANS(${latitude})) * COS(RADIANS(longitude - ${longitude})))) * 60 * 1.515 * 1.609344 AS dist_kms  
        FROM
            [bigquery-public-data:ghcn_d.ghcnd_stations] AS stn
        JOIN
            [bigquery-public-data:ghcn_d.ghcnd_${year}] AS wx
        ON
            wx.id = stn.id
        WHERE
            wx.element = 'TMAX' AND
            DATE(wx.date) = '${year}-${month}-${day}'
        ORDER BY
            dist_kms ASC, max_temperature DESC
        LIMIT
            10
        `
        const options = {
            query: sqlQuery,
            location: 'US',
            useLegacySql: true
        };
        const [rows] = await bigquery.query(options);

        const json2csvParser = new Json2csvParser({ fields });
        const csv = json2csvParser.parse(rows);

        const filename = `${year}${month}${day}.csv`
        const file = storage.bucket(bucketName).file(filename);
        await file.save(csv);
        await file.makePublic()

        const body = {
            'text': "Notification From Cloud Scheduler & Cloud Function",
            "attachments": [
                {
                    "title": "Daily Historical Climate Report Jakarta Area (CSV)",
                    "title_link": `https://storage.googleapis.com/${bucketName}/${filename}`,
                    "text": `Climate Report For ${date.toUTCString()}`,
                    "color": "#764FA5"
                }
            ]
        }

        await fetch(slackNotificationURL, {
            method: 'post',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        })

        res.status(200).send("Successfully deliver notification to slack channel")
    } catch (e) {
        res.status(400)
            .send(e.message)
    }
};
