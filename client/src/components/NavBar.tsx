import { Box, Button, Flex, Heading, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import React from "react";
import {
  MeDocument,
  MeQuery,
  useLogoutMutation,
  useMeQuery,
} from "../generated/graphql";

const NavBar = () => {
  const { data, loading: useMeQueryLoading } = useMeQuery();

  const [logout, { loading: useLogoutMutationLoading }] = useLogoutMutation();

  const logoutUser = async () => {
    await logout({
      update(cache, { data }) {
        if (data?.logout) {
          cache.writeQuery<MeQuery>({
            query: MeDocument,
            data: { me: null },
          });
        }
      },
    });
  };

  let body;

  if (useMeQueryLoading) {
    body = null;
  } else if (!data?.me) {
    body = (
      <>
        <NextLink href="/login" legacyBehavior>
          <Link mr={2}>Login</Link>
        </NextLink>
        <NextLink href="/register" legacyBehavior>
          <Link>Register</Link>
        </NextLink>
      </>
    );
  } else {
    body = (
      <Flex>
        <NextLink href={"/create-post"}>
          <Button mr={4}>Create Post</Button>
        </NextLink>
        <Button onClick={logoutUser} isLoading={useLogoutMutationLoading}>
          Logout
        </Button>
      </Flex>
    );
  }

  return (
    <Box bg={"tan"} p={4}>
      <Flex
        maxW={800}
        justifyContent="space-between"
        alignItems="center"
        m="auto"
      >
        <NextLink href={"/"}>
          <Heading>Reddit</Heading>
        </NextLink>
        <Box>{body}</Box>
      </Flex>
    </Box>
  );
};

export default NavBar;
