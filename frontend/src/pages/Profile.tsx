import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useHeader } from "@/contexts/HeaderContext";
import { getOrCreateIdentity, setCustomName } from "@/lib/client";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function ProfilePage() {
  const { setBreadcrumbs } = useHeader();
  const [identity, setIdentity] = useState(() => getOrCreateIdentity());
  const [displayName, setDisplayName] = useState(
    identity.customName || identity.generatedName,
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Esteemed", href: "/" }, { label: "Profile" }]);
  }, [setBreadcrumbs]);

  const handleSave = useCallback(() => {
    const trimmed = displayName.trim();
    if (trimmed && trimmed !== identity.generatedName) {
      setCustomName(trimmed);
    } else {
      // Clear custom name if it matches generated or is empty
      setCustomName("");
    }
    setIdentity(getOrCreateIdentity());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [displayName, identity.generatedName]);

  const handleReset = useCallback(() => {
    setCustomName("");
    const newIdentity = getOrCreateIdentity();
    setIdentity(newIdentity);
    setDisplayName(newIdentity.generatedName);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const hasCustomName = identity.customName !== undefined;
  const hasChanges =
    displayName.trim() !== (identity.customName || identity.generatedName);

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle as="h1">Profile</CardTitle>
          <CardDescription>
            Manage your display name for planning sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Display Name
            </label>
            <Input
              id="displayName"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Generated name:{" "}
            <span className="font-medium">{identity.generatedName}</span>
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!displayName.trim() || !hasChanges}
              className="flex-1"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
            {hasCustomName && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button variant="ghost" asChild className="w-full">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
