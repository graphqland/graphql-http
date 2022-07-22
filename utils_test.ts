import { gql } from "./utils.ts";
import { describe, expect, it } from "./dev_deps.ts";

describe("gql", () => {
  it("should trim left and right", () => {
    expect(gql`    query{hello}   `).toBe("query{hello}");
  });
  it("should remove whitespace", () => {
    expect(gql`query { hello }`).toBe("query{hello}");
  });
  it("should remove whitespace between word boundaries", () => {
    expect(gql`query { hello world }`).toBe("query{hello world}");
  });

  it("should remove line break", () => {
    expect(gql`query {
      hello
      world
    }
`).toBe("query{hello world}");
  });

  it("should remove whitespace with arguments", () => {
    expect(gql`query  Test   ($id :   ID!)
{
      hello     (id  : $id  )
      world
    }
`).toBe("query Test($id:ID!){hello(id:$id)world}");
  });

  it("should remove when complex query", () => {
    expect(gql`query  Test   ($ id  :   Id!)
{
      hello     (id  : $id  )
      world
    }

    mutation  TestMutate  ($ id  :   Id!)  {
crateUser    ( id      : $id   )
         }
`).toBe(
      "query Test($id:Id!){hello(id:$id)world}mutation TestMutate($id:Id!){crateUser(id:$id)}",
    );
  });
  it("should same when it is compressed", () => {
    expect(
      gql
        `query Test($id:Id!){hello(id:$id)world}mutation TestMutate($id:Id!){crateUser(id:$id)}`,
    ).toBe(
      "query Test($id:Id!){hello(id:$id)world}mutation TestMutate($id:Id!){crateUser(id:$id)}",
    );
  });
});
