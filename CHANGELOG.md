# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.2.2] - 2023-04-28

-   Reduced initial token count again

## [3.2.1] - 2023-04-22

### Changed

-   Reduced initial token count

### Changed

-   Reduced initial token count

## [3.2.0] - 2023-04-10

### Changed

-   Encrypt all messages and logs
-   Refactored the message schema to be simpler

## [3.1.4] - 2023-04-10

### Changed

-   Turn off the "ignore everyone mentions" config since nobody uses it

### Fixed

-   Added the who command and more info to help
-   Only log messages if channel is configured

## [3.1.3] - 2023-04-10

### Changed

-   Reduce initial values

## [3.1.2] - 2023-04-07

### Changed

-   Auto leave young servers

### Added

-   Added admin post to force leave a server

## [3.1.1] - 2023-04-07

### Fixed

-   Catch an error in replying (during an error caught response to command)

## [3.1.0] - 2023-04-05

### Changed

-   Refactored message to process in another file
-   Messages are queued per channel instead of firing at once to help avoid rate limiting

## [3.0.18] - 2023-04-03

### Fixed

-   Fixed Stripe tax thing

### Changed

-   Increased price of GPT-4 tokens
-   Added logging for payment webhook

## [3.0.17] - 2023-04-03

### Changed

-   Enable Stripe Taax

## [3.0.16] - 2023-04-03

### Changed

-   Check moderation on system messages

## [3.0.15] - 2023-04-03

### Fixed

-   Super long system messages get trimmed so Discord doesn't blow up on respones

## [3.0.14] - 2023-04-03

### Fixed

-   Delete moderation violations from database
-   Properly delete flagged messages if more than one were detected

## [3.0.13] - 2023-04-02

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

[Unreleased]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.2.2...HEAD

[3.2.2]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.2.1...3.2.2

[3.2.1]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.2.0...3.2.1

[3.2.0]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.1.4...3.2.0

[3.1.4]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.1.3...3.1.4

[3.1.3]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.1.2...3.1.3

[3.1.2]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.1.1...3.1.2

[3.1.1]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.1.0...3.1.1

[3.1.0]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.18...3.1.0

[3.0.18]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.17...3.0.18

[3.0.17]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.16...3.0.17

[3.0.16]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.15...3.0.16

[3.0.15]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.14...3.0.15

[3.0.14]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.13...3.0.14

[3.0.13]: https://github.com/MarcDerhammer/DiscordAIBot/compare/3.0.12...3.0.13

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
