# Backend

Run from this folder:

`npm run migrate`

`npm start`

Default local URL: `http://127.0.0.1:8080`

The migration seeds a local demo account for first-time login:

`demo@goli-transit.local`

`DemoPass123!`

Forgot password emails are sent through SMTP via `nodemailer`.
Set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, and `MAIL_FROM_NAME` in `.env`.
