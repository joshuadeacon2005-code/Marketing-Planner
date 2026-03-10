import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { User as UserIcon, X } from "lucide-react";
import type { User } from "@shared/schema";

interface UserAutocompleteProps {
  users: User[] | undefined;
  value: string | null | undefined;
  onSelect: (userId: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "default";
  "data-testid"?: string;
}

export function UserAutocomplete({
  users,
  value,
  onSelect,
  onClear,
  placeholder = "Type to search...",
  className = "",
  triggerClassName = "",
  size = "default",
  "data-testid": testId,
}: UserAutocompleteProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUser = users?.find((u) => u.id === value);

  const filtered = search.trim()
    ? (users || []).filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : (users || []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[highlightIndex]) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    }
  };

  const handleSelect = (user: User) => {
    onSelect(user.id);
    setSearch("");
    setIsOpen(false);
  };

  const sizeClasses = size === "sm"
    ? "h-7 text-xs"
    : "h-9 text-sm";

  if (selectedUser && !isOpen) {
    return (
      <div
        ref={containerRef}
        className={`relative ${className}`}
        data-testid={testId}
      >
        <button
          type="button"
          className={`flex items-center gap-2 w-full border rounded-md px-3 bg-background hover:bg-muted/50 transition-colors ${sizeClasses} ${triggerClassName}`}
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          data-testid={testId ? `${testId}-trigger` : undefined}
        >
          <UserIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate flex-1 text-left">{selectedUser.name}</span>
          {onClear && (
            <span
              role="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              data-testid={testId ? `${testId}-clear` : undefined}
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} data-testid={testId}>
      <Input
        ref={inputRef}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${sizeClasses} ${triggerClassName}`}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
          {filtered.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                idx === highlightIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/50"
              }`}
              onMouseEnter={() => setHighlightIndex(idx)}
              onClick={() => handleSelect(user)}
              data-testid={testId ? `${testId}-option-${user.id}` : undefined}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && search.trim() && filtered.length === 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
          No users found
        </div>
      )}
    </div>
  );
}
