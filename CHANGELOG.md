# [1.0.0-beta.13](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.12...1.0.0-beta.13) (2022-07-22)


### Features

* add `gql` function that compress graphql query ([59eacbe](https://github.com/TomokiMiyauci/graphql-http/commit/59eacbe49ea8014bf7a8926486f05af57899d952))

# [1.0.0-beta.12](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.11...1.0.0-beta.12) (2022-07-21)


### Features

* add `gqlHandler` that manage GraphQL over HTTP request ([a356946](https://github.com/TomokiMiyauci/graphql-http/commit/a356946ef240f07da3ec217c30a5d6792612797b))
* export `createResponse` function that create GraphQL over HTTP compliant `Response` object ([3ad3313](https://github.com/TomokiMiyauci/graphql-http/commit/3ad3313bf18fed201768b26f8a01a509392bf405))
* export `resolveRequest` function that take out graphql parameters from `Request` object safety ([53b04ae](https://github.com/TomokiMiyauci/graphql-http/commit/53b04ae814db5a56ae8181ad5da7ea98f3541f7e))

# [1.0.0-beta.11](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.10...1.0.0-beta.11) (2022-07-20)


### Features

* export `resolveResponse` that de-serialize graphql response safety ([6aaf20c](https://github.com/TomokiMiyauci/graphql-http/commit/6aaf20c7a7ee3e0367bf08d16c5e9a228604249d))

# [1.0.0-beta.10](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.9...1.0.0-beta.10) (2022-07-20)


### Features

* export `createRequest` function that create `Request` what include GraphQL header and body ([405ce48](https://github.com/TomokiMiyauci/graphql-http/commit/405ce4806f7b3901680a40d662b34de82670db5f))

# [1.0.0-beta.9](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.8...1.0.0-beta.9) (2022-07-20)


### Features

* add graphql over http client ([26525b8](https://github.com/TomokiMiyauci/graphql-http/commit/26525b8f0a23d0f9d54e4d3a073f4f88f1319824))

# [1.0.0-beta.8](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.7...1.0.0-beta.8) (2022-07-18)


### Bug Fixes

* change schema types to remove `string` types ([8df3508](https://github.com/TomokiMiyauci/graphql-http/commit/8df35081cd2820ca545cb4576024b1c16b862990))


### Features

* accept schema as `string`, build schema with error handling ([3b81be1](https://github.com/TomokiMiyauci/graphql-http/commit/3b81be11b70e47d696870beccb29d0fc5dc62a68))

# [1.0.0-beta.7](https://github.com/TomokiMiyauci/graphql-http/compare/1.0.0-beta.6...1.0.0-beta.7) (2022-07-17)


### Features

* add custom request function to context ([c3ee404](https://github.com/TomokiMiyauci/graphql-http/commit/c3ee404bcb46eccbc127327e37c993f60ebeb523))
* add throwing error when validation of schema error ([0ddbf08](https://github.com/TomokiMiyauci/graphql-http/commit/0ddbf081a2972d6afe39f2de704521cdb9609b75))

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
