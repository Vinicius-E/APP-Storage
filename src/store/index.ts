import { configureStore } from '@reduxjs/toolkit';
import dummyReducer from './dummySlice';

const store = configureStore({
  reducer: {
    dummy: dummyReducer,
  },
});

export default store;