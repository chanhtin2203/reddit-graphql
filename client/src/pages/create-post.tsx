import { Box, Button, Flex, Spinner } from "@chakra-ui/react";
import { Form, Formik } from "formik";
import InputField from "../components/InputField";
import Layout from "../components/Layout";
import { useCheckAuth } from "../utils/useCheckAuth";
import NextLink from "next/link";
import { CreatePostInput, useCreatePostMutation } from "../generated/graphql";
import router from "next/router";

const CreatePost = () => {
  const { data: authData, loading: authLoading } = useCheckAuth();

  const initialValues = { title: "", text: "" };

  const [createPost, _] = useCreatePostMutation();

  const onCreatePostSubmit = async (values: CreatePostInput) => {
    await createPost({
      variables: { createPostInput: values },
      update(cache, { data }) {
        cache.modify({
          fields: {
            posts(existing) {
              if (data?.createPost.success && data.createPost.post) {
                // Post: new_id
                const newPostRef = cache.identify(data.createPost.post);

                const newPostsAfterCreation = {
                  ...existing,
                  totalCount: existing.totalCount + 1,
                  paginatedPosts: [
                    { __ref: newPostRef },
                    ...existing.paginatedPosts,
                  ],
                };
                return newPostsAfterCreation;
              }
            },
          },
        });
      },
    });
    router.push("/");
  };

  if (authLoading || (!authLoading && !authData?.me)) {
    return (
      <Flex justifyContent="center" alignItems="center" minH="100vh">
        <Spinner />
      </Flex>
    );
  } else {
    return (
      <Layout>
        <Formik initialValues={initialValues} onSubmit={onCreatePostSubmit}>
          {({ isSubmitting }) => (
            <Form>
              <InputField
                name="title"
                placeholder="Title"
                label="Title"
                type="text"
              />

              <Box mt={4}>
                <InputField
                  name="text"
                  placeholder="Text"
                  label="Text"
                  type="text"
                  textarea
                />
              </Box>
              <Flex mt={2}>
                <NextLink href={"/"} legacyBehavior>
                  <Button ml="auto">Go back to Homepage</Button>
                </NextLink>
              </Flex>

              <Button
                type="submit"
                colorScheme="teal"
                mt={4}
                isLoading={isSubmitting}
              >
                Create Post
              </Button>
            </Form>
          )}
        </Formik>
      </Layout>
    );
  }
};

export default CreatePost;
