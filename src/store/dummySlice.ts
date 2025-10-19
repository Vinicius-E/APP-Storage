// src/store/dummySlice.ts
import { createSlice } from '@reduxjs/toolkit';

const dummySlice = createSlice({
  name: 'dummy',
  initialState: { active: true },
  reducers: {
    toggle: (state) => {
      state.active = !state.active;
    },
  },
});

export const { toggle } = dummySlice.actions;
export default dummySlice.reducer;
