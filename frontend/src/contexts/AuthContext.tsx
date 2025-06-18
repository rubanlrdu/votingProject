import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: number;
    username: string;
    isAdmin: boolean;
    has_voted?: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => Promise<void>;
    requireFaceVerification: boolean;
    setRequireFaceVerification: (value: boolean) => void;
    completeFaceVerification: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [requireFaceVerification, setRequireFaceVerification] = useState(false);

    useEffect(() => {
        // Check session on initial load
        const checkSession = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/auth/session', {
                    credentials: 'include',
                });
                const data = await response.json();
                
                if (data.user) {
                    // Check if face verification is required
                    const profileResponse = await fetch('http://localhost:3001/api/auth/me', {
                        credentials: 'include',
                    });
                    
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        if (profileData.face_descriptors && profileData.application_status === 'Approved' && !profileData.isAdmin) {
                            // If face verification is required, don't set the user yet
                            setRequireFaceVerification(true);
                            setUser(null); // Ensure user is not set until face verification
                            return;
                        }
                    }
                    // Only set user if face verification is not required
                    setUser(data.user);
                    setRequireFaceVerification(false);
                }
            } catch (error) {
                console.error('Session check failed:', error);
                setUser(null);
                setRequireFaceVerification(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    const login = (userData: User) => {
        // Only set user if face verification is not required
        if (!requireFaceVerification) {
            setUser(userData);
        }
    };

    const logout = async () => {
        try {
            await fetch('http://localhost:3001/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout failed:', error);
        }
        setUser(null);
        setRequireFaceVerification(false);
    };

    const completeFaceVerification = (userData: User) => {
        setUser(userData);
        setRequireFaceVerification(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user && !requireFaceVerification, // Only authenticated if user exists and no face verification required
            isLoading,
            login,
            logout,
            requireFaceVerification,
            setRequireFaceVerification,
            completeFaceVerification,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 