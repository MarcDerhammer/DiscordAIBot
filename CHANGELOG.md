# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

-   Fixed `/reset` not deleting messages from the database

## [3.0.12] - 2023-04-02

### Changed

-   Changed `/tokens` command to add the pricing page

## [3.0.11] - 2023-04-02

-   Log to mongo as well as console for easier parsing of logs

## [3.0.10] - 2023-04-02

-   Lowered price of GPT-4 Tokens

## [3.0.9] - 2023-04-01

### Added

-   ntfy.sh support

### Fixed

-   Bug with when a server didn't give the bot proper permissions was crashing the server

## [3.0.8] - 2023-04-01

### Fixed

-   Fixed a bug related to max token count calculation

### Added

-   Added admin request to adjust balance and send messages

## [3.0.7] - 2023-04-01

### Changed

-   Adjusted max token calcuation
-   Added some logging 

## [3.0.6] - 2023-04-01

### Changed

-   Better logging

## [3.0.5] - 2023-04-01

### Added

-   Some more logging

## [3.0.4] - 2023-04-01

### Changed

-   Don't subtract from balance until a response is successfully generated

## [3.0.3] - 2023-04-01

### Changed

-   Minimum age on servers to prevent abuse

## [3.0.2] - 2023-04-01

### Changed

-   Bots are now always ignored, no config to allow them

## [3.0.1] - 2023-04-01

### Fixed

-   Stripe links

## [3.0.0] - 2023-04-01

### Changed

-   Totally changed this to be a sort of SAAS kind of thing
-   Stripe purchase integration
-   Commands to config
-   Persist to mongo instead of json files

## [2.0.1] - 2023-03-29

Initial Release (sort of)

[Unreleased]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.12...HEAD

[3.0.12]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.11...3.0.12

[3.0.11]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.10...3.0.11

[3.0.10]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.9...3.0.10

[3.0.9]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.8...3.0.9

[3.0.8]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.7...3.0.8

[3.0.7]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.6...3.0.7

[3.0.6]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.5...3.0.6

[3.0.5]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.4...3.0.5

[3.0.4]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.3...3.0.4

[3.0.3]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.2...3.0.3

[3.0.2]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.1...3.0.2

[3.0.1]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.0...3.0.1

[3.0.0]: https://github.com/MarcDerhammer/DiscordAIBot/compare/2.0.1...3.0.0

[2.0.1]: https://github.com/MarcDerhammer/DiscordAIBot/compare/8dd7d24674bf168f9c0b21f97aeaf2e3f57641ce...2.0.1
