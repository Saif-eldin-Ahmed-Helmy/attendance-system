import React from 'react';

interface AuthContextProps {
    user: any;
    setUser: React.Dispatch<React.SetStateAction<any>>;
}

export const AuthContext = React.createContext<AuthContextProps | undefined>(undefined);