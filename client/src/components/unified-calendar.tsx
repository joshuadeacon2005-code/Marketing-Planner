import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Filter, Calendar as CalendarIcon, Mail, Image, CalendarDays, X } from "lucide-react";
import type { Brand, Region } from "@shared/schema";

interface CalendarEvent {
  id: string;
  title: string;
  type: "SOCIAL" | "EMAIL" | "EVENT";
  date: Date | string;
  brandId: string | null;
  regionId: string;
  status: string;
  platform?: string;
  eventType?: string;
  emailType?: string;
  brandColor?: string;
}

interface UnifiedCalendarProps {
  brandId?: string;
  regionId?: string;
  onEventClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export function UnifiedCalendar({ brandId, regionId, onEventClick, compact = false }: UnifiedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["SOCIAL", "EMAIL", "EVENT"]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brandId || "all");
  const [selectedRegionId, setSelectedRegionId] = useState<string>(regionId || "all");

  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["/api/regions"],
  });

  const { data: calendarEvents, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar", startDate.toISOString(), endDate.toISOString(), selectedBrandId, selectedRegionId, selectedTypes.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        contentTypes: selectedTypes.join(","),
      });
      if (selectedBrandId && selectedBrandId !== "all") {
        params.set("brandId", selectedBrandId);
      }
      if (selectedRegionId && selectedRegionId !== "all") {
        params.set("regionId", selectedRegionId);
      }
      const res = await fetch(`/api/calendar?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch calendar');
      return res.json();
    },
  });

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    if (!calendarEvents) return [];
    return calendarEvents.filter(event => {
      const eventDate = typeof event.date === 'string' ? parseISO(event.date) : event.date;
      return isSameDay(eventDate, day);
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SOCIAL": return <Image className="w-3 h-3" />;
      case "EMAIL": return <Mail className="w-3 h-3" />;
      case "EVENT": return <CalendarDays className="w-3 h-3" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string, brandColor?: string) => {
    if (brandColor) return brandColor;
    switch (type) {
      case "SOCIAL": return "#3b82f6";
      case "EMAIL": return "#8b5cf6";
      case "EVENT": return "#10b981";
      default: return "#6b7280";
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardContent className={compact ? "p-0" : ""}>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold" data-testid="text-calendar-month">
            {format(currentDate, "MMMM yyyy")}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              data-testid="button-next-month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!compact && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-calendar-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Content Types</h4>
                      <div className="space-y-2">
                        {["SOCIAL", "EMAIL", "EVENT"].map(type => (
                          <div key={type} className="flex items-center gap-2">
                            <Checkbox
                              id={`type-${type}`}
                              checked={selectedTypes.includes(type)}
                              onCheckedChange={() => toggleType(type)}
                              data-testid={`checkbox-type-${type.toLowerCase()}`}
                            />
                            <label htmlFor={`type-${type}`} className="text-sm flex items-center gap-2">
                              {getTypeIcon(type)}
                              {type === "SOCIAL" ? "Social Posts" : type === "EMAIL" ? "Email Campaigns" : "Events"}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {!brandId && (
                      <div>
                        <h4 className="font-medium mb-2 text-sm">Brand</h4>
                        <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                          <SelectTrigger data-testid="select-brand-filter">
                            <SelectValue placeholder="All Brands" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Brands</SelectItem>
                            {brands?.map(brand => (
                              <SelectItem key={brand.id} value={brand.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: brand.color }} />
                                  {brand.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {!regionId && (
                      <div>
                        <h4 className="font-medium mb-2 text-sm">Region</h4>
                        <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                          <SelectTrigger data-testid="select-region-filter">
                            <SelectValue placeholder="All Regions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            {regions?.map(region => (
                              <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {selectedTypes.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {selectedTypes.map(type => (
              <Badge
                key={type}
                variant="outline"
                className="flex items-center gap-1"
                style={{ borderColor: getTypeColor(type), color: getTypeColor(type) }}
              >
                {getTypeIcon(type)}
                {type === "SOCIAL" ? "Social" : type === "EMAIL" ? "Email" : "Events"}
                <button
                  onClick={() => toggleType(type)}
                  className="ml-1 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
          {weekDays.map(day => (
            <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {weeks.map((week, weekIndex) => (
            week.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`bg-background p-1 min-h-[80px] ${
                    !isCurrentMonth ? "opacity-40" : ""
                  } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                  data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className="text-xs font-medium mb-1 text-right pr-1">
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className="text-xs px-1 py-0.5 rounded cursor-pointer truncate hover:opacity-80"
                        style={{
                          backgroundColor: `${getTypeColor(event.type, event.brandColor)}20`,
                          borderLeft: `2px solid ${getTypeColor(event.type, event.brandColor)}`,
                        }}
                        onClick={() => onEventClick?.(event)}
                        title={event.title}
                        data-testid={`calendar-event-${event.id}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ))}
        </div>

        {compact && (
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getTypeColor("SOCIAL") }} />
              Social
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getTypeColor("EMAIL") }} />
              Email
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getTypeColor("EVENT") }} />
              Events
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
