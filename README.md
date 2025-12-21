# Stork Watch

Stork Watch is an application that helps expecting parents keep their friends, families, and loved ones in the loop of their pregnancy. With a simple text message, parents can send updates to predetermined groups or their entire contact list.

Each pregnancy will also have a status page that can be updated via text message so couples are able to maintain their tracker page with a few key strokes instead of having to log onto a site.

## How it works
A couple or individual who are expecting a child register with Stork Watch and provide any details they want to share (due date, sex, name, etc.). If one member of a couple signs up, they can then invite their partner to become a co-owner of the pregnancy. 

Next a custom, private tracking page is created where the status of the pregnancy is shown. The couple can add things like ultrasound photos, appointment updates, growth changes. 

At this point the couple will recieve a text message from their Stork Watch number. Any new updates can be sent via text to this number and the tracking page will update accordingly.

The couple then decides who they want to invite to be able to recieve updates, and view their tracking page by adding their contacts' phone numbers. These invitees can be organized into groups so that the couple can choose to send updates to everyone, or share certain news with their closer contacts. 

Now the couple can text updates to their Stork Watch number and Stork Watch will text the designated contacts who are targeted for the update.

For example they might text:
`Just had our 20 week appointnment and everything is looking great!`

Stork Watch would then reply:
`Who should we share the news with? 'College buds', 'Parents', 'Siblings', 'Snackpack', or 'All'?`

The couple replies:
`Parents and Siblings`

And Stork Watch sends the news out!

## Development
- Install dependencies: `npm install`
- Configure environment: copy `.env.example` to `.env` and set `DATABASE_URL` (PostgreSQL) plus Twilio credentials.
- Generate Prisma client: `npm run prisma:generate`
- Run the app: `npm run dev` (defaults to `http://localhost:3000`)
- Lint: `npm run lint`

### Twilio setup (for phone verification)
- Provision a Verify Service in Twilio and set `TWILIO_VERIFY_SERVICE_SID` in `.env` along with `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
- The registration flow will send an SMS code to confirm the phone before creating the account.
