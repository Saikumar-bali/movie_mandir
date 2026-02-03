// App.js
import React, { useEffect } from 'react';
import AppNavigator from './AppNavigator';

const App = () => {
  useEffect(() => {
    console.log('🏁 App mounted - Movie Mandir');
  }, []);

  return <AppNavigator />;
};

export default App;