import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Box, IconButton } from "@chakra-ui/react";

const PostEditDeleteButtons = () => {
  return (
    <Box>
      <IconButton icon={<EditIcon />} aria-label="edit" mr={4} />
      <IconButton
        icon={<DeleteIcon />}
        aria-label="delete"
        colorScheme={"red"}
      />
    </Box>
  );
};

export default PostEditDeleteButtons;
