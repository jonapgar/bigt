# bigt
pronounced "big tee"
a lightweight javascript localization library supporting interfaces, substitution and recursion for nodejs and browsers
a dropin replacement for i18next (does not support all features, but most of them)

## new 'defaulting' config options
### defaultUnderscoresToBlank
Setting this to true will cause any missing language keys *which begin with an
underscore* to be replaced with an empty string. This is useful for keys that
might exist conditionally for whatever reason.

### defaultMissingToBlank
Setting this to true will cause any missing language keys to be replaced with an
empty string. This is potentially desirable in production where exposing absent
language keys might be particularly ugly.
