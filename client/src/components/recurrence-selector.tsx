import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Repeat, Calendar } from "lucide-react";

export interface RecurrenceSettings {
  enabled: boolean;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  daysOfWeek: string[];
  dayOfMonth: number | null;
  endDate: string | null;
  occurrences: number | null;
}

interface RecurrenceSelectorProps {
  value: RecurrenceSettings;
  onChange: (settings: RecurrenceSettings) => void;
}

const defaultSettings: RecurrenceSettings = {
  enabled: false,
  frequency: "WEEKLY",
  interval: 1,
  daysOfWeek: [],
  dayOfMonth: null,
  endDate: null,
  occurrences: null,
};

const weekDays = [
  { value: "SUN", label: "Sun" },
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
];

export function RecurrenceSelector({ value = defaultSettings, onChange }: RecurrenceSelectorProps) {
  const [endType, setEndType] = useState<"never" | "date" | "occurrences">("never");

  useEffect(() => {
    if (value.endDate) {
      setEndType("date");
    } else if (value.occurrences) {
      setEndType("occurrences");
    } else {
      setEndType("never");
    }
  }, []);

  const updateSettings = (updates: Partial<RecurrenceSettings>) => {
    onChange({ ...value, ...updates });
  };

  const toggleDayOfWeek = (day: string) => {
    const newDays = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter(d => d !== day)
      : [...value.daysOfWeek, day];
    updateSettings({ daysOfWeek: newDays });
  };

  const handleEndTypeChange = (type: "never" | "date" | "occurrences") => {
    setEndType(type);
    if (type === "never") {
      updateSettings({ endDate: null, occurrences: null });
    } else if (type === "date") {
      updateSettings({ occurrences: null });
    } else {
      updateSettings({ endDate: null });
    }
  };

  const getFrequencyLabel = () => {
    switch (value.frequency) {
      case "DAILY": return value.interval === 1 ? "day" : "days";
      case "WEEKLY": return value.interval === 1 ? "week" : "weeks";
      case "MONTHLY": return value.interval === 1 ? "month" : "months";
      case "YEARLY": return value.interval === 1 ? "year" : "years";
      default: return "";
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-muted-foreground" />
            <Label className="font-medium">Recurring Content</Label>
          </div>
          <Switch
            checked={value.enabled}
            onCheckedChange={(checked) => updateSettings({ enabled: checked })}
            data-testid="switch-recurrence"
          />
        </div>

        {value.enabled && (
          <div className="space-y-4 pl-6 border-l-2 border-muted">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Every</span>
              <Input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) => updateSettings({ interval: parseInt(e.target.value) || 1 })}
                className="w-16"
                data-testid="input-interval"
              />
              <Select
                value={value.frequency}
                onValueChange={(freq) => updateSettings({ frequency: freq as RecurrenceSettings["frequency"] })}
              >
                <SelectTrigger className="w-32" data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Day(s)</SelectItem>
                  <SelectItem value="WEEKLY">Week(s)</SelectItem>
                  <SelectItem value="MONTHLY">Month(s)</SelectItem>
                  <SelectItem value="YEARLY">Year(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {value.frequency === "WEEKLY" && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">On these days:</Label>
                <div className="flex gap-1 flex-wrap">
                  {weekDays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDayOfWeek(day.value)}
                      className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                        value.daysOfWeek.includes(day.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      data-testid={`button-day-${day.value.toLowerCase()}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {value.frequency === "MONTHLY" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">On day</span>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={value.dayOfMonth || 1}
                  onChange={(e) => updateSettings({ dayOfMonth: parseInt(e.target.value) || 1 })}
                  className="w-16"
                  data-testid="input-day-of-month"
                />
                <span className="text-sm text-muted-foreground">of the month</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Ends:</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="end-never"
                    checked={endType === "never"}
                    onChange={() => handleEndTypeChange("never")}
                    className="w-4 h-4"
                  />
                  <label htmlFor="end-never" className="text-sm">Never</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="end-date"
                    checked={endType === "date"}
                    onChange={() => handleEndTypeChange("date")}
                    className="w-4 h-4"
                  />
                  <label htmlFor="end-date" className="text-sm">On date</label>
                  {endType === "date" && (
                    <Input
                      type="date"
                      value={value.endDate || ""}
                      onChange={(e) => updateSettings({ endDate: e.target.value })}
                      className="w-40"
                      data-testid="input-end-date"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="end-occurrences"
                    checked={endType === "occurrences"}
                    onChange={() => handleEndTypeChange("occurrences")}
                    className="w-4 h-4"
                  />
                  <label htmlFor="end-occurrences" className="text-sm">After</label>
                  {endType === "occurrences" && (
                    <>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={value.occurrences || 5}
                        onChange={(e) => updateSettings({ occurrences: parseInt(e.target.value) || 5 })}
                        className="w-16"
                        data-testid="input-occurrences"
                      />
                      <span className="text-sm">occurrences</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 inline mr-2" />
              <span>
                Repeats every {value.interval} {getFrequencyLabel()}
                {value.frequency === "WEEKLY" && value.daysOfWeek.length > 0 && (
                  <> on {value.daysOfWeek.join(", ")}</>
                )}
                {value.frequency === "MONTHLY" && value.dayOfMonth && (
                  <> on day {value.dayOfMonth}</>
                )}
                {endType === "date" && value.endDate && (
                  <>, until {value.endDate}</>
                )}
                {endType === "occurrences" && value.occurrences && (
                  <>, {value.occurrences} times</>
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
