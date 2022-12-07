require("dotenv").config();
import express from "express";
import cors from "cors";
import { createConnection } from "typeorm";
import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import "reflect-metadata";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/Hello";
import { UserResolver } from "./resolvers/user";
import { PostResolver } from "./resolvers/post";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import session from "express-session";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Context } from "./types/Context";

const main = async () => {
  await createConnection({
    type: "postgres",
    database: "reddit",
    username: process.env.DB_USERNAME_DEV,
    password: process.env.DB_PASSWORD_DEV,
    logging: true,
    synchronize: true,
    entities: [User, Post],
  });

  const app = express();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  const mongoUrl = `mongodb+srv://${process.env.SESSION_DB_USERNAME_DEV_PROD}:${process.env.SESSION_DB_PASSWORD_DEV_PROD}@cluster0.mpurhre.mongodb.net/?retryWrites=true&w=majority`;
  // Session/Cookie Store
  await mongoose.connect(mongoUrl);

  console.log("MongoDb connected");

  app.use(
    session({
      name: COOKIE_NAME,
      store: MongoStore.create({ mongoUrl }),
      cookie: {
        maxAge: 1000 * 60 * 60, // one hour
        httpOnly: true,
        secure: __prod__, // cookie only works in https
        sameSite: "lax", // protection against CSRF
      },
      secret: process.env.SESSION_SECRET_DEV_PROD as string,
      saveUninitialized: false, // don't save empty sessions, right from the start
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, UserResolver, PostResolver],
      validate: false,
    }),
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
    context: ({ req, res }): Context => ({ req, res }),
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({ app, cors: false });

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () =>
    console.log(
      `Server listening on PORT ${PORT}, GraphQL server on localhost:${PORT}${apolloServer.graphqlPath}`
    )
  );
};

main().catch((err) => console.error(err));
