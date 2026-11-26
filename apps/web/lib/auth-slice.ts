import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  // Access-токен живёт только в памяти: в localStorage его смог бы прочитать XSS.
  accessToken: string | null;
  status: "loading" | "authenticated" | "guest";
};

const initialState: AuthState = { accessToken: null, status: "loading" };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.status = "authenticated";
    },
    sessionEnded(state) {
      state.accessToken = null;
      state.status = "guest";
    },
  },
});

export const { sessionStarted, sessionEnded } = authSlice.actions;
export const authReducer = authSlice.reducer;
