# Serble Website
This is the Serble website, you can view it live right now at [serble.net](https://serble.net).
It primarily serves as an account management site for your Serble account,
but also has a [fun little game](https://serble.net/wordmaster) and an [E2E note app](https://serble.net/notes)
that you can use securely in your browser.

## Translations
Manual translations (for real languages) live in `src/assets/locales` and are managed through [Weblate](https://weblate.serble.net).

The generated locales that a machine can produce like `bin` (binary), `lol` (LOLCat) and
`tes` (gibberish) - are not in that folder, so Weblate leaves them alone. They're
generated from `default.json` into `src/assets/locales-generated` by
`npm run generate-locales`, which `npm run dev` and `npm run build` do for you.

## Contributing
Go for it! This website is fully open source and contributions are very welcome. Just open
a pull request.
