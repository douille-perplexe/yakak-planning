"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, UserMinus, Loader2 } from "lucide-react";
import { Profile } from "@/lib/types";
import { approveUser, denyUser, removeMember } from "@/app/actions/admin";

export function AdminPanel({
  pendingUsers: initialPending,
  approvedMembers: initialMembers,
}: {
  pendingUsers: Profile[];
  approvedMembers: Profile[];
}) {
  const [pendingUsers, setPendingUsers] = useState(initialPending);
  const [approvedMembers, setApprovedMembers] = useState(initialMembers);
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    if (loading) return;
    setLoading(userId);
    const result = await approveUser(userId);
    if (result.success) {
      const user = pendingUsers.find((u) => u.id === userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      if (user) {
        setApprovedMembers((prev) => [
          ...prev,
          { ...user, status: "approved" },
        ]);
      }
    }
    setLoading(null);
  };

  const handleDeny = async (userId: string) => {
    if (loading) return;
    setLoading(userId);
    const result = await denyUser(userId);
    if (result.success) {
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    setLoading(null);
  };

  const handleRemove = async (userId: string) => {
    if (loading) return;
    if (!confirm("Are you sure you want to remove this member?")) return;
    setLoading(userId);
    const result = await removeMember(userId);
    if (result.success) {
      setApprovedMembers((prev) => prev.filter((u) => u.id !== userId));
    }
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Admin</h2>

      {/* Pending requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Requests
            {pendingUsers.length > 0 && (
              <Badge variant="destructive">{pendingUsers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending requests.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id)}
                      disabled={loading === user.id}
                    >
                      {loading === user.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeny(user.id)}
                      disabled={loading === user.id}
                    >
                      {loading === user.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle>
            Members ({approvedMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {approvedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>
                      {member.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.display_name}</p>
                      {member.role === "admin" && (
                        <Badge variant="default">admin</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </div>
                {member.role !== "admin" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(member.id)}
                    disabled={loading === member.id}
                  >
                    {loading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
