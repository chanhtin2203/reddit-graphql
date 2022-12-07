import argon2 from "argon2";
import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { COOKIE_NAME } from "../constants";
import { User } from "../entities/User";
import { TokenModel } from "../models/Token";
import { ChangePasswordInput } from "../types/ChangePassword";
import { Context } from "../types/Context";
import { ForgotPasswordInput } from "../types/ForgotPassword";
import { LoginInput } from "../types/LoginInput";
import { RegisterInput } from "../types/RegisterInput";
import { UserMutationResponse } from "../types/UserMutationResponse";
import { sendEmail } from "../utils/sendEmail";
import { validateRegisterInput } from "../utils/validateRegisterInput";

@Resolver((_of) => User)
export class UserResolver {
  @FieldResolver((_returns) => String)
  email(@Root() user: User, @Ctx() { req }: Context) {
    return req.session.userId === user.id ? user.email : "";
  }

  @Query((_returns) => User, { nullable: true })
  async me(@Ctx() { req }: Context): Promise<User | undefined | null> {
    if (!req.session.userId) return null;
    const user = await User.findOne({ where: { id: req.session.userId } });
    return user;
  }

  @Mutation((_returns) => UserMutationResponse)
  async register(
    @Arg("registerInput") registerInput: RegisterInput,
    @Ctx() { req }: Context
  ): Promise<UserMutationResponse> {
    const validateRegisterInputError = validateRegisterInput(registerInput);
    if (validateRegisterInputError !== null) {
      return { code: 400, success: false, ...validateRegisterInputError };
    }
    try {
      const { username, email, password } = registerInput;
      const existingUser = await User.findOne({
        where: [{ username }, { email }],
      });
      if (existingUser)
        return {
          code: 400,
          success: false,
          message: "Duplicate username or email",
          errors: [
            {
              field: existingUser.username === username ? "username" : "email",
              message: `${
                existingUser.username === username ? "Username" : "Email"
              } already taken`,
            },
          ],
        };

      const hashedPassword = await argon2.hash(password);

      const newUser = User.create({
        username,
        password: hashedPassword,
        email,
      });

      await newUser.save();

      req.session.userId = newUser.id;

      return {
        code: 200,
        success: true,
        message: "User registration successful",
        user: newUser,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Mutation((_returns) => UserMutationResponse)
  async login(
    @Arg("loginInput") { usernameOrEmail, password }: LoginInput,
    @Ctx() { req }: Context
  ): Promise<UserMutationResponse> {
    try {
      const existingUser = await User.findOne(
        usernameOrEmail.includes("@")
          ? { where: [{ email: usernameOrEmail }] }
          : { where: [{ username: usernameOrEmail }] }
      );
      if (!existingUser) {
        return {
          code: 400,
          success: false,
          message: "User not found",
          errors: [
            {
              field: "usernameOrEmail",
              message: "Username or email incorrect",
            },
          ],
        };
      }

      const passwordValid = await argon2.verify(
        existingUser.password,
        password
      );

      if (!passwordValid)
        return {
          code: 400,
          success: false,
          message: "Wrong password",
          errors: [
            {
              field: "password",
              message: "Wrong password",
            },
          ],
        };

      // create session and return cookie
      req.session.userId = existingUser.id;

      return {
        code: 200,
        success: true,
        message: "Logged in successfully",
        user: existingUser,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Mutation((_returns) => Boolean)
  logout(@Ctx() { req, res }: Context): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      res.clearCookie(COOKIE_NAME);
      req.session.destroy((err) => {
        if (err) {
          console.log("Session Error", err);
          resolve(false);
        }
        resolve(true);
      });
    });
  }

  @Mutation((_returns) => Boolean)
  async forgotPassword(
    @Arg("forgotPasswordInput") forgotPasswordInput: ForgotPasswordInput
  ): Promise<boolean> {
    const user = await User.findOne({
      where: { email: forgotPasswordInput.email },
    });
    if (!user) return true;

    await TokenModel.findOneAndDelete({ userId: `${user.id}` });

    const resetToken = uuidv4();
    const hashedResetToken = await argon2.hash(resetToken);

    // save token to db
    await new TokenModel({
      userId: `${user.id}`,
      token: hashedResetToken,
    }).save();

    // send reset password link to user via email

    await sendEmail(
      forgotPasswordInput.email,
      `<a href="http://localhost:3000/change-password?token=${resetToken}&userId=${user.id}">Click here to reset your password </a>`
    );

    return true;
  }

  @Mutation((_returns) => UserMutationResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("userId") userId: string,
    @Arg("changePasswordInput") changePasswordInput: ChangePasswordInput,
    @Ctx() { req }: Context
  ): Promise<UserMutationResponse> {
    if (changePasswordInput.newPassword.length <= 2)
      return {
        code: 400,
        success: false,
        message: "Invalid Password",
        errors: [
          { field: "newPassword", message: "Lenght must be greater than 2" },
        ],
      };

    try {
      const resetPasswordTokenRecord = await TokenModel.findOne({ userId });

      if (!resetPasswordTokenRecord) {
        return {
          code: 400,
          success: false,
          message: "Invalid or expired password reset token",
          errors: [
            {
              field: "token",
              message: "Invalid or expired password reset token",
            },
          ],
        };
      }

      const resetPasswordTokenValid = argon2.verify(
        resetPasswordTokenRecord.token,
        token
      );

      if (!resetPasswordTokenValid)
        return {
          code: 400,
          success: false,
          message: "Invalid or expired password reset token",
          errors: [
            {
              field: "token",
              message: "Invalid or expired password reset token",
            },
          ],
        };

      const userIdNum = parseInt(userId);
      const user = await User.findOne({ where: { id: userIdNum } });
      if (!user)
        return {
          code: 400,
          success: false,
          message: "User no longer exists",
          errors: [
            {
              field: "token",
              message: "User no longer exists",
            },
          ],
        };

      const updatedPassword = await argon2.hash(
        changePasswordInput.newPassword
      );
      await User.update({ id: userIdNum }, { password: updatedPassword });

      await resetPasswordTokenRecord.deleteOne();

      req.session.userId = user.id;

      return {
        code: 200,
        success: true,
        message: "User password reset successfully",
        user,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }
}
