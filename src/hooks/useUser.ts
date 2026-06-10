"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(MOCK_USER_ID);
      }
    };
    
    fetchUser();

    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(MOCK_USER_ID);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return userId;
}
