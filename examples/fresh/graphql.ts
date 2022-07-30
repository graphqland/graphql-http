import { createHandler } from "https://deno.land/x/graphql_http@1.0.0-beta.8/mod.ts";
import { buildSchema } from "https://esm.sh/graphql";

const JOKES = [
  "Why do Java developers often wear glasses? They can't C#.",
  "A SQL query walks into a bar, goes up to two tables and says “can I join you?”",
  "Wasn't hard to crack Forrest Gump's password. 1forrest1.",
  "I love pressing the F5 key. It's refreshing.",
  "Called IT support and a chap from Australia came to fix my network connection.  I asked “Do you come from a LAN down under?”",
  "There are 10 types of people in the world. Those who understand binary and those who don't.",
  "Why are assembly programmers often wet? They work below C level.",
  "My favourite computer based band is the Black IPs.",
  "What programme do you use to predict the music tastes of former US presidential candidates? An Al Gore Rhythm.",
  "An SEO expert walked into a bar, pub, inn, tavern, hostelry, public house.",
];

const schemaStr = await Deno.readTextFile("schema.graphql");
const schema = buildSchema(schemaStr);
const handler = createHandler(schema, {
  playground: true,
  playgroundOptions: {
    endpoint: "/graphql",
  },
  rootValue: {
    joke: () => {
      const randomIndex = Math.floor(Math.random() * JOKES.length);
      const body = JOKES[randomIndex];
      return body;
    },
  },
});

export default handler;
