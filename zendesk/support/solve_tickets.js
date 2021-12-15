/* eslint-disable no-console */
const request = require("request");

const zendeskSubdomain = "ZENDESK_SUBDOMAIN";
const zendeskUsername = "ZENDESK_EMAIL_ADDRESS";
const zendeskApiToken = "ZENDESK_API_KEY";

const operation = process.argv[2];
if (operation === "solve") {
} else {
  throw new Error(
    `${operation} is not a valid operation. Must be one of soft-delete, permanently-delete or restore`
  );
}

if ((process.argv[3] || "").length === 0) {
  throw new Error("Please provide at least one ticket ID to delete");
}

const ticketIds = process.argv[3].split(",");
const maxBucketSize = 100;
const buckets = [];

const operationToApiMapping = {
  solve: "tickets/update_many.json",
};

const performOperation = (ids, op) => {
  const apiURL = `https://${zendeskSubdomain}.zendesk.com/api/v2/${operationToApiMapping[op]}?ids=${ids}`;

  let httpMethod = null;
  if (operation === "solve") {
    httpMethod = "PUT";
  }

  request(
    {
      url: apiURL,
      method: httpMethod,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${zendeskUsername}/token:${zendeskApiToken}`
        ).toString("base64")}`,
      },
      body: {
        ticket: {
          comment: {
            body: `Solved via Bulk Solve Script on: ${new Date().toLocaleString()}`,
            public: false,
          },
          type: "incident",
          problem_id: 1028033,
          assignee_id: 1508674801742,
          group_id: 1500005786421,
          additional_tags: ["20210907_billing_system_maintenance_email"],
          custom_fields: [
            { id: 360004966774, value: "topic_selection_other" },
            { id: 360007217054, value: true },
          ],
          status: "solved",
        },
      },
      json: true,
    },
    (_, response, body) => {
      if (response.statusCode === 401) {
        console.log(
          "Authentication failed. Please check your API credentials."
        );
        return;
      }

      // We have hit a rate limit. Read the "Retry-After" header and retry
      // the request later on
      if (response.statusCode === 429) {
        const delay = response.headers["retry-after"];
        console.log(
          `Hit a rate limit, will wait for ${delay} seconds and try again.`
        );
        setTimeout(() => {
          console.log(`Retrying after waiting for ${delay} seconds`);
          performOperation(ticketIds);
        }, delay * 1000);
        return;
      }

      console.log(body || "Done");
    }
  );
};

while (ticketIds.length > 0) {
  buckets.push(ticketIds.splice(0, maxBucketSize));
}

// Kick-off an API request for each bucket of ticket IDs. We will handle rate limiting
// in the request callback itself which will retry the request automatically whenever
// we run into a rate limit by using the `Retry-After` response header the API returns.
buckets.forEach((bucket) => {
  performOperation(bucket.join(","), operation);
});
