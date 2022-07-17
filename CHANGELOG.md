# [1.0.0-beta.6](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.5...1.0.0-beta.6) (2022-07-17)


### Bug Fixes

* fix typo "application/graphql" to "application/graphql+json" ([78e592e](https://github.com/TomokiMiyauci/graphql-http/commit/78e592ebdc30933c51df187017e82e56c429040c))
* treat the default accept header value as `application/json` ([1e65348](https://github.com/TomokiMiyauci/graphql-http/commit/1e6534836250578a961175ff457d3155154fa5e3))


### Features

* add Accept header validation on POST method ([04f5da8](https://github.com/TomokiMiyauci/graphql-http/commit/04f5da89f093f29c68133f396112ae8db06b0c63))
* add validation for "Content-Type" charset on POST method ([12741a3](https://github.com/TomokiMiyauci/graphql-http/commit/12741a345f51c2d722fc29a9be72d76c38aaaa74))
* add validation step for graphql schema and graphql itself ([30a3e69](https://github.com/TomokiMiyauci/graphql-http/commit/30a3e69e4c342901e3fc7e53050f30a238788f05))

# [1.0.0-beta.5](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.4...1.0.0-beta.5) (2022-07-16)


### Features

* add "Accept" header validationn for GET request ([c310b4c](https://github.com/TomokiMiyauci/graphql-http/commit/c310b4c7695d9fed45e6ee9cdfbc8a83239ace9c))
* add validate query operation on GET method ([941abda](https://github.com/TomokiMiyauci/graphql-http/commit/941abdacfa03729453c3e3d2bade1cb05e4ccb98))

# [1.0.0-beta.4](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.3...1.0.0-beta.4) (2022-07-15)


### Bug Fixes

* overwrite defalut header "content-type" to application/json ([5d1b75c](https://github.com/TomokiMiyauci/graphql-http/commit/5d1b75c5260823139a4c9127d98e3e1f8c5689b6))
* when "query" parameter is not exist on POST, fallback from query string ([553c8a0](https://github.com/TomokiMiyauci/graphql-http/commit/553c8a0675232b3894435709d852469cb088f14c))

# [1.0.0-beta.3](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.2...1.0.0-beta.3) (2022-07-14)


### Bug Fixes

* return application/json content anytime for strict GraphQL over HTTP Spec ([b745284](https://github.com/TomokiMiyauci/graphql-http/commit/b74528436099f6c089e96dc3574c6c9490191167))

# [1.0.0-beta.2](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.1...1.0.0-beta.2) (2022-07-11)


### Bug Fixes

* no dynamic import to avoid deno deploy limitation ([5fb8a8f](https://github.com/TomokiMiyauci/graphql-http/commit/5fb8a8f98a7878d3e9a7aac68a255eb273c2f1dd))

# 1.0.0-beta.1 (2022-07-11)


### Features

* add graphql http middleware to handle http request ([eb9b3f0](https://github.com/TomokiMiyauci/graphql-http/commit/eb9b3f01242c6aa72ce8105bbc18b5ed3cefa77c))