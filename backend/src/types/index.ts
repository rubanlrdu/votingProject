// Session types
declare module 'express-session' {
    interface SessionData {
        user?: {
            id: number;
            username: string;
            isAdmin: boolean;
        }
    }
}

// Database models
export interface User {
    id: number;
    username: string;
    password_hash: string;
    full_name?: string;
    address?: string;
    mobile_number?: string;
    id_proof_filename?: string;
    face_descriptors?: string;
    date_of_birth?: string;
    application_status: 'Pending' | 'Approved' | 'Rejected';
    rejection_reason?: string;
    is_admin: boolean;
    has_voted: boolean;
    realtime_photo_filename?: string;
}

export interface Vote {
    id: number;
    user_id: number;
    candidate_id: number;
    timestamp: string;
}

export interface Candidate {
    id: number;
    name: string;
    date_of_birth?: string;
    party?: string;
    image_url?: string;
    description: string;
    vote_count: number;
} 