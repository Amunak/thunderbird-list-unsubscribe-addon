# Thunderbird List-Unsubscribe Addon

This addon adds a button to the mail-view toolbar that allows you to unsubscribe
from mailing lists and similar bulk mailing services as long as they use the
`List-Unsubscribe` header as defined in RFC2369. `List-Unsubscribe-Post` as defined
in RFC8058 is also supported.

When you click "Unsubscribe" the addon analyzes the email and depending on available
options shows buttons to one-click unsubscribe, open the unsubscribe link (in the
built-in browser) or use the provided unsubscribe email address to compose a new
email.

Additionally you can click the exposed link to copy it to clipboard.


### Permissions required

- **messagesRead**: Required to access the email headers.
- **accountsRead**: Required to fetch the correct "identity" to send the unsubscribe email from.
- **clipboardWrite**: Required to allow copying the unsubscribe link to clipboard.
- **webRequest**: Required for making the one-click unsubscribe requests. This is also why the addon needs access to all HTTP and HTTPS URLs.
