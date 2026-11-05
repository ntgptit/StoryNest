"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Eye, Globe, Heart, Home, Library, Link2, Lock, MessageSquare, Search, User } from "lucide-react";
import { Bold, CalendarClock, Italic, Minus, Monitor, Smartphone, Tablet, TextSearch } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppLink, useAppToast, useNavigation } from "@storynest/features";
import { Avatar, AvatarFallback } from "@storynest/ui/components/avatar";
import { Badge } from "@storynest/ui/components/badge";
import { Button } from "@storynest/ui/components/button";
import { Checkbox } from "@storynest/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@storynest/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@storynest/ui/components/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@storynest/ui/components/form";
import { FormErrorSummary } from "@storynest/ui/components/form-error-summary";
import { Input } from "@storynest/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@storynest/ui/components/select";
import { Separator } from "@storynest/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@storynest/ui/components/sheet";
import { Skeleton } from "@storynest/ui/components/skeleton";
import { Switch } from "@storynest/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@storynest/ui/components/tabs";
import { Textarea } from "@storynest/ui/components/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@storynest/ui/components/tooltip";
import { AppShell } from "@storynest/ui/widgets/app-shell";
import { BottomNav } from "@storynest/ui/widgets/bottom-nav";
import { ConfirmDialog } from "@storynest/ui/widgets/confirm-dialog";
import { EmptyState } from "@storynest/ui/widgets/empty-state";
import { ErrorState } from "@storynest/ui/widgets/error-state";
import { InfiniteList } from "@storynest/ui/widgets/infinite-list";
import { PageHeader } from "@storynest/ui/widgets/page-header";
import { SaveRibbonIcon } from "@storynest/ui/widgets/save-ribbon-icon";
import { AutosaveIcon, type AutosaveIconState } from "@storynest/ui/widgets/autosave-icon";
import { HeartBurstIcon } from "@storynest/ui/widgets/heart-burst-icon";
import { RingingBellIcon } from "@storynest/ui/widgets/ringing-bell-icon";
import { turnedOn, useTriggerCount } from "@storynest/ui/lib/use-trigger-count";
import { StatPill } from "@storynest/ui/widgets/stat-pill";
import { CardCarousel } from "@storynest/ui/widgets/card-carousel";
import { CopyLinkButton } from "@storynest/ui/widgets/copy-link-button";
import { ExpandableText } from "@storynest/ui/widgets/expandable-text";
import { FindReplaceBar } from "@storynest/ui/widgets/find-replace-bar";
import { FunnelSteps, type FunnelStep } from "@storynest/ui/widgets/funnel-steps";
import { ScatterPicker } from "@storynest/ui/widgets/scatter-picker";
import { ImageCropDialog, type CropArea } from "@storynest/ui/widgets/image-crop-dialog";
import { MegaNav, MegaNavSection, megaNavItemClass, type MegaNavEntry } from "@storynest/ui/widgets/mega-nav";
import { MergeChoice } from "@storynest/ui/widgets/merge-choice";
import { ScheduledOutbox, ScheduledOutboxItem } from "@storynest/ui/widgets/scheduled-outbox";
import { ShareDialog, type ShareAccessOption } from "@storynest/ui/widgets/share-dialog";
import { StickyActionBar } from "@storynest/ui/widgets/sticky-action-bar";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { SyncedSmallMultiples, type SmallMultipleDay } from "@storynest/ui/widgets/synced-small-multiples";
import { CalendarHeatmap, type HeatmapCell, type HeatLevel } from "@storynest/ui/widgets/calendar-heatmap";
import { BulkActionDock } from "@storynest/ui/widgets/bulk-action-dock";
import { DetailPanel } from "@storynest/ui/widgets/detail-panel";
import { ChangeStepper, FoldRow, FoldToggle } from "@storynest/ui/widgets/diff-folds";
import { RowActionsButton, RowActionsMenu, type RowAction } from "@storynest/ui/widgets/row-actions-menu";
import { DragHandle, SortableItem, useSortableList } from "@storynest/ui/widgets/sortable-list";
import { useCountdown } from "@storynest/ui/lib/use-countdown";
import { AutocompleteInput, type AutocompleteOption } from "@storynest/ui/widgets/autocomplete-input";
import { ConnectionBanner, type ConnectionState } from "@storynest/ui/widgets/connection-banner";
import { DropZone } from "@storynest/ui/widgets/drop-zone";
import { EmailTypoHint } from "@storynest/ui/widgets/email-typo-hint";
import { EnvelopeSent, ResendButton } from "@storynest/ui/widgets/envelope-sent";
import {
  FullScreenMenu,
  fullScreenMenuItemStyle,
  fullScreenMenuLinkClass,
} from "@storynest/ui/widgets/full-screen-menu";
import { PasswordStrengthMeter, type StrengthScore } from "@storynest/ui/widgets/password-strength-meter";
import { PullToRefresh } from "@storynest/ui/widgets/pull-to-refresh";
import { SkySwitch } from "@storynest/ui/widgets/sky-switch";
// Batch 2 · browse
import { SearchBox } from "@storynest/features";
import { BookmarkMinus } from "lucide-react";
import { useFlip } from "@storynest/ui/lib/use-flip";
import { FeaturedCarousel } from "@storynest/ui/widgets/featured-carousel";
import { RollingNumber } from "@storynest/ui/widgets/rolling-number";
import { StoryCard, type StoryCardData } from "@storynest/ui/widgets/story-card";
import { StoryPeekSheet } from "@storynest/ui/widgets/story-peek-sheet";
import { StoryViewToggle, useStoredView } from "@storynest/ui/widgets/story-view-toggle";
import { SwipeToRemove } from "@storynest/ui/widgets/swipe-to-remove";
import { useSwipeTabs } from "@storynest/ui/widgets/swipe-tabs";
import { BackToTopButton } from "@storynest/ui/widgets/back-to-top-button";
import { DetentSheetContent } from "@storynest/ui/widgets/detent-sheet";
import { HighlightSweep } from "@storynest/ui/widgets/highlight-sweep";
import { ImageLightbox } from "@storynest/ui/widgets/image-lightbox";
import { ReadingTimeLeft } from "@storynest/ui/widgets/reading-time-left";
import { SelectionToolbar, useBlockSelection } from "@storynest/ui/widgets/selection-toolbar";
import { SpoilerText } from "@storynest/ui/widgets/spoiler-text";
import { Label } from "@storynest/ui/components/label";
import { RadioCards } from "@storynest/ui/widgets/radio-cards";
import { ReadinessChecklist } from "@storynest/ui/widgets/readiness-checklist";
import { ResponsivePreview } from "@storynest/ui/widgets/responsive-preview";
import { SearchResultPreview } from "@storynest/ui/widgets/search-result-preview";
import { ShortcutTooltip, ToolbarTooltips } from "@storynest/ui/widgets/shortcut-tooltip";
import { SplitButton } from "@storynest/ui/widgets/split-button";
import { SplitPane } from "@storynest/ui/widgets/split-pane";
import { SpotlightTour } from "@storynest/ui/widgets/spotlight-tour";
import { UnsavedChangesBar } from "@storynest/ui/widgets/unsaved-changes-bar";
import { CoverStack } from "@storynest/ui/widgets/cover-stack";
import { InlineEditTitle } from "@storynest/ui/widgets/inline-edit-title";
import { PadlockIcon } from "@storynest/ui/widgets/padlock-icon";
// Batch 3 · studio3
import { Breadcrumbs } from "@storynest/ui/widgets/breadcrumbs";
import { InlineAlert } from "@storynest/ui/widgets/inline-alert";
import { SubmitButton } from "@storynest/ui/widgets/submit-button";
import { revealFrom } from "@storynest/ui/lib/view-transition";
import { AccordionList } from "@storynest/ui/widgets/accordion-list";
import { FinishCelebration } from "@storynest/ui/widgets/finish-celebration";
import { PlayPauseButton } from "@storynest/ui/widgets/play-pause-button";
import { RollingStepper } from "@storynest/ui/widgets/rolling-stepper";
import { ScrubIndex, scrollRowToTop } from "@storynest/ui/widgets/scrub-index";
import { SectionOutline } from "@storynest/ui/widgets/section-outline";
import { SwatchPicker } from "@storynest/ui/widgets/swatch-picker";
// Batch 3 · shell3
import { PenLine, Settings } from "lucide-react";
import { AvailabilityHint, type AvailabilityStatus } from "@storynest/ui/widgets/availability-hint";
import { CommandPalette } from "@storynest/ui/widgets/command-palette";
import { LockoutCountdown } from "@storynest/ui/widgets/lockout-countdown";
import { WaveIntro } from "@storynest/ui/widgets/wave-intro";
import { useArrivals } from "@storynest/ui/lib/use-arrivals";
import { cn } from "@storynest/ui/lib/utils";
import { CharacterRing } from "@storynest/ui/widgets/character-ring";
import { ChoicePills } from "@storynest/ui/widgets/choice-pills";
import { SizeShrink } from "@storynest/ui/widgets/size-shrink";
import { SwipeToReply } from "@storynest/ui/widgets/swipe-to-reply";
import { UploadVeil } from "@storynest/ui/widgets/upload-veil";
// Batch 4 · habits4
import { ReadingHabitsView, toReadingHabits, type DayRow, type StatsRow } from "@storynest/features";
import { EventPopup } from "@storynest/ui/widgets/event-popup";
import { ExpandingSettings } from "@storynest/ui/widgets/expanding-settings";
import { RoleMatrix } from "@storynest/ui/widgets/role-matrix";
import { RollingBanner } from "@storynest/ui/widgets/rolling-banner";
import { MessageCircle, Users } from "lucide-react";
import { BarRace, type RaceFrame } from "@storynest/ui/widgets/bar-race";
import { CohortGrid, type CohortRow } from "@storynest/ui/widgets/cohort-grid";
import { DateRangeCalendar, type DateRange } from "@storynest/ui/widgets/date-range-calendar";
import { FlowSankey } from "@storynest/ui/widgets/flow-sankey";
import { RangeHistogram, type HistogramBucket } from "@storynest/ui/widgets/range-histogram";
import { SlopeChart, type SlopeItem } from "@storynest/ui/widgets/slope-chart";
import { TrendingTerms, type TrendingTerm } from "@storynest/ui/widgets/trending-terms";
import { WaffleChart } from "@storynest/ui/widgets/waffle-chart";
import { WordCloud, type CloudPeriod } from "@storynest/ui/widgets/word-cloud";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 py-6">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function FormExample() {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const toast = useAppToast();
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => toast.success("Form is valid"))} className="flex max-w-sm flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>Validated with Zod through react-hook-form.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Sign in</Button>
      </form>
    </Form>
  );
}

/** Save toggle with the ribbon animation (SaveRibbonIcon, adapted from a Lucian UX/UI Prompt element). */
function SaveToggleExample() {
  const [saved, setSaved] = useState(false);
  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      className="px-3"
      aria-pressed={saved}
      onClick={() => setSaved((value) => !value)}
    >
      <SaveRibbonIcon saved={saved} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

const AUTOSAVE_STATES: AutosaveIconState[] = ["pending", "saving", "saved", "failed"];

/** Motion widgets adapted from Lucian UX/UI Prompt elements; each one only animates on a change. */
function MotionExamples() {
  const [voted, setVoted] = useState(false);
  const [following, setFollowing] = useState(false);
  const followRings = useTriggerCount(following, turnedOn);
  const [arrivals, setArrivals] = useState(0);
  const [autosave, setAutosave] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const autosaveState = AUTOSAVE_STATES[autosave % AUTOSAVE_STATES.length] ?? "pending";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={voted ? "default" : "outline"}
          className="px-3"
          aria-pressed={voted}
          onClick={() => setVoted((value) => !value)}
        >
          <HeartBurstIcon active={voted} />
          {voted ? "Voted" : "Vote"}
        </Button>
        <Button
          type="button"
          variant={following ? "default" : "outline"}
          className="px-3"
          aria-pressed={following}
          onClick={() => setFollowing((value) => !value)}
        >
          <RingingBellIcon rings={followRings} active={following} />
          {following ? "Following" : "Follow"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setArrivals((value) => value + 1)}>
          <RingingBellIcon rings={arrivals} className="size-5" />
          New notification
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAutosave((value) => value + 1)}>
          <AutosaveIcon state={autosaveState} />
          Autosave: {autosaveState}
        </Button>
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => setError((value) => (value === "Wrong password" ? "Too many attempts" : "Wrong password"))}
        >
          Show sign-in error
        </Button>
        {/* Same look and key-driven replay as the auth FormError. */}
        {error ? (
          <p
            key={error}
            role="alert"
            className="animate-shake rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InfiniteExample() {
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const items = Array.from({ length: count }, (_, i) => ({ id: String(i + 1) }));
  return (
    <InfiniteList
      items={items}
      getKey={(item) => item.id}
      renderItem={(item) => <div className="border-b py-3 text-sm">{`Story ${item.id}`}</div>}
      hasMore={count < 15}
      isLoadingMore={loading}
      onLoadMore={() => {
        setLoading(true);
        setTimeout(() => {
          setCount((n) => n + 5);
          setLoading(false);
        }, 400);
      }}
      loadingFallback={<Skeleton className="my-3 h-6 w-full" />}
      loadMoreLabel="Load more"
      endMessage={<p className="py-4 text-center text-sm text-muted-foreground">That is everything.</p>}
    />
  );
}

/** Error summary over a two-field form: submit it empty to see the summary, fix a field to see the count drop. */
function FormErrorSummaryExample() {
  const form = useForm<{ title: string; author: string }>({ defaultValues: { title: "", author: "" } });
  const toast = useAppToast();
  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(() => toast.success("Story details saved"))}
        className="flex max-w-sm flex-col gap-4"
      >
        <FormErrorSummary
          title={(count) => (count === 1 ? "1 field needs attention" : `${count} fields need attention`)}
        />
        <FormField
          control={form.control}
          name="title"
          rules={{ required: "Give the story a title" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Story title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="author"
          rules={{ required: "Say who wrote it" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pen name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-fit">
          Save details
        </Button>
      </form>
    </Form>
  );
}

const DEMO_TITLES = [
  "The Lighthouse Keeper",
  "Salt and Ash",
  "Midnight Library",
  "Paper Moons",
  "The Quiet Orchard",
  "Iron Feathers",
  "Under the Willow",
  "Glass Rivers",
];

/** A 2:3 SVG cover as a data URL: a hue per story and its initial, so the tiles differ without any network. */
function demoCoverUrl(index: number): string {
  const hue = (index * 47 + 200) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 65% 55%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 70% 30%)"/></linearGradient></defs><rect width="200" height="300" fill="url(%23g)"/><circle cx="150" cy="70" r="36" fill="hsl(${hue} 90% 85% / 0.55)"/></svg>`;
  return `data:image/svg+xml;utf8,${svg.replaceAll('"', "'")}`;
}

function CardCarouselExample() {
  const toast = useAppToast();
  return (
    <CardCarousel title="Trending this week" previousLabel="Previous stories" nextLabel="Next stories">
      {DEMO_TITLES.map((title, index) => (
        <button
          key={title}
          type="button"
          className="flex w-full flex-col gap-1.5 rounded-lg text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={() => toast.info(`Opened ${title}`)}
        >
          <StoryCover title={title} coverUrl={index % 3 === 2 ? null : demoCoverUrl(index)} />
          <span className="line-clamp-2 text-sm font-medium">{title}</span>
        </button>
      ))}
    </CardCarousel>
  );
}

/** Draws a gradient with a grid and a few rings into a canvas and returns it as an object URL (revoke it when done). */
function makeDemoImage(width: number, height: number): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("No 2D canvas"));
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "hsl(265 70% 55%)");
  gradient.addColorStop(0.5, "hsl(330 75% 60%)");
  gradient.addColorStop(1, "hsl(30 90% 60%)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "hsl(0 0% 100% / 0.35)";
  context.lineWidth = 2;
  for (let x = 0; x <= width; x += 100) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 100) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.lineWidth = 10;
  context.strokeStyle = "hsl(0 0% 100% / 0.8)";
  context.beginPath();
  context.arc(width / 2, height / 2, Math.min(width, height) / 4, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "hsl(0 0% 100% / 0.9)";
  context.font = `bold ${Math.round(height / 10)}px sans-serif`;
  context.textAlign = "center";
  context.fillText(`${width} × ${height}`, width / 2, height / 2 + height / 30);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
}

type CropDemo = { kind: "avatar" | "cover"; url: string; width: number; height: number };

const CROP_LABELS = {
  title: "Crop the picture",
  description: "Drag to move it, use the slider or the wheel to zoom.",
  frame: "Crop frame. Arrow keys move the picture, plus and minus zoom.",
  zoom: "Zoom",
  confirm: "Use this crop",
  cancel: "Cancel",
};

function ImageCropExample() {
  const [crop, setCrop] = useState<CropDemo | null>(null);
  const [result, setResult] = useState<string>("No crop yet");

  const start = async (kind: CropDemo["kind"]) => {
    const [width, height] = kind === "avatar" ? [1200, 800] : [1600, 1000];
    const url = await makeDemoImage(width, height);
    setCrop({ kind, url, width, height });
  };
  const finish = (area: CropArea | null) => {
    if (crop) URL.revokeObjectURL(crop.url);
    if (area && crop) {
      const box = `x ${Math.round(area.x)}, y ${Math.round(area.y)}, ${Math.round(area.width)} × ${Math.round(area.height)}`;
      setResult(`${crop.kind === "avatar" ? "Avatar (round, 1:1)" : "Cover (2:3)"}: ${box}`);
    } else setResult("Cancelled");
    setCrop(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void start("avatar")}>
          Crop an avatar (round)
        </Button>
        <Button type="button" variant="outline" onClick={() => void start("cover")}>
          Crop a cover (2:3)
        </Button>
      </div>
      <p data-slot="crop-result" className="font-mono text-xs text-muted-foreground">
        {result}
      </p>
      {crop ? (
        <ImageCropDialog
          imageUrl={crop.url}
          imageWidth={crop.width}
          imageHeight={crop.height}
          aspect={crop.kind === "avatar" ? 1 : 2 / 3}
          shape={crop.kind === "avatar" ? "round" : "rect"}
          labels={CROP_LABELS}
          onConfirm={(area) => finish(area)}
          onCancel={() => finish(null)}
        />
      ) : null}
    </div>
  );
}

const NAV_GENRES = ["Romance", "Fantasy", "Mystery", "Science fiction", "Horror", "Poetry"];
const NAV_TAGS = ["slow burn", "found family", "enemies to lovers", "cozy", "time travel", "dragons"];

function MegaNavExample() {
  const entries: MegaNavEntry[] = [
    { kind: "link", key: "home", href: "#nav-home", label: "Home", active: true },
    {
      kind: "panel",
      key: "browse",
      label: "Browse",
      panel: (
        <div className="flex gap-6">
          <MegaNavSection title="Categories">
            {NAV_GENRES.map((genre) => (
              <li key={genre}>
                <AppLink href={`#nav-${genre.replaceAll(" ", "-")}`} className={megaNavItemClass()}>
                  {genre}
                </AppLink>
              </li>
            ))}
          </MegaNavSection>
          <MegaNavSection title="Popular tags">
            {NAV_TAGS.map((tag) => (
              <li key={tag}>
                <AppLink href={`#nav-${tag.replaceAll(" ", "-")}`} className={megaNavItemClass()}>
                  {`#${tag}`}
                </AppLink>
              </li>
            ))}
          </MegaNavSection>
        </div>
      ),
    },
    {
      kind: "panel",
      key: "ranking",
      label: "Rankings",
      panel: (
        <MegaNavSection title="Top stories">
          {["Today", "This week", "This month", "All time"].map((period, index) => (
            <li key={period}>
              <AppLink href={`#nav-rank-${index}`} className={megaNavItemClass(index === 1)}>
                {period}
              </AppLink>
            </li>
          ))}
        </MegaNavSection>
      ),
    },
    { kind: "link", key: "library", href: "#nav-library", label: "Library" },
    { kind: "link", key: "write", href: "#nav-write", label: "Write" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground md:hidden">
        The mega nav is hidden below md (768px), where the bottom navigation takes over. Widen the window to see it.
      </p>
      <div className="hidden min-h-80 rounded-lg border md:block">
        <MegaNav entries={entries} label="Gallery navigation" LinkComponent={AppLink} />
      </div>
    </div>
  );
}

const STATS_END = Date.UTC(2026, 10, 5);
const DAY_MS = 86_400_000;
const STATS_DAYS = 90;
const NOTES: Record<number, string> = {
  40: "Chapter 3 published",
  70: "Chapter 4 published",
  85: "Chapter 5 published",
};
const longDay = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const ALL_DAYS: SmallMultipleDay[] = Array.from({ length: STATS_DAYS }, (_, index) => {
  const date = new Date(STATS_END - (STATS_DAYS - 1 - index) * DAY_MS);
  const note = NOTES[index];
  return {
    key: date.toISOString().slice(0, 10),
    label: longDay.format(date),
    short: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
    ...(note ? { note } : {}),
  };
});

/** Deterministic wave plus a bump after each published chapter, so the charts look alive but never change. */
function demoSeries(base: number, swing: number, seed: number): number[] {
  return Array.from({ length: STATS_DAYS }, (_, index) => {
    const bump = Object.keys(NOTES).reduce((sum, key) => {
      const since = index - Number(key);
      return since >= 0 && since < 6 ? sum + base * (1.2 - since * 0.2) : sum;
    }, 0);
    const wave = Math.sin(index / 5 + seed) * swing + Math.sin(index * 1.7 + seed) * swing * 0.4;
    return Math.max(0, Math.round(base + wave + index * base * 0.006 + bump));
  });
}

const SERIES = { reads: demoSeries(140, 40, 0), votes: demoSeries(22, 8, 1.3), comments: demoSeries(6, 3, 2.1) };
const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

function funnelSteps(range: Range): FunnelStep[] {
  const start = range === 7 ? 420 : range === 30 ? 1800 : 5200;
  const keep =
    range === 90
      ? [1, 0.82, 0.74, 0.7, 0.45, 0.9, 0.88, 0.86, 0.84, 0.8]
      : [1, 0.78, 0.8, 0.62, 0.86, 0.9, 0.9, 0.87, 0.85, 0.82];
  let value = start;
  const values = keep.map((factor) => (value = Math.round(value * factor)));
  const drops = values.map((current, index) => (index === 0 ? 0 : 1 - current / (values[index - 1] ?? current)));
  const worst = drops.indexOf(Math.max(...drops));
  return values.map((current, index) => ({
    key: `ch-${index + 1}`,
    label: `Chapter ${index + 1}`,
    sublabel: ["The storm", "Salt", "The keeper", "Letters", "Low tide", "Fog", "The lamp", "Return", "Embers", "Dawn"][
      index
    ],
    valueText: current.toLocaleString("en"),
    widthPercent: (current / (values[0] ?? 1)) * 100,
    ...(index > 0 ? { changeText: `−${Math.round((drops[index] ?? 0) * 100)}%` } : {}),
    highlight: index === worst,
    detail: `Chapter ${index + 1}: ${current.toLocaleString("en")} readers in the last ${range} days`,
  }));
}

function StatsExample() {
  const [range, setRange] = useState<Range>(30);
  const days = ALL_DAYS.slice(-range);
  const reads = SERIES.reads.slice(-range);
  const votes = SERIES.votes.slice(-range);
  const comments = SERIES.comments.slice(-range);
  const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
  const signed = new Intl.NumberFormat("en", { signDisplay: "exceptZero" });
  return (
    <div className="flex flex-col gap-4">
      <Tabs value={String(range)} onValueChange={(value) => setRange(Number(value) as Range)}>
        <TabsList aria-label="Range">
          {RANGES.map((option) => (
            <TabsTrigger key={option} value={String(option)}>
              {`${option} days`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid gap-6 lg:grid-cols-2">
        <SyncedSmallMultiples
          days={days}
          slots={STATS_DAYS}
          series={[
            { key: "reads", label: "Reads", values: reads, tone: 1 },
            { key: "votes", label: "Votes", values: votes, tone: 2 },
            { key: "comments", label: "Comments", values: comments, tone: 3 },
          ]}
          formatValue={(value) => value.toLocaleString("en")}
          formatDelta={(delta) => signed.format(delta)}
          describeDay={(index) =>
            `${days[index]?.label}: ${reads[index]} reads, ${votes[index]} votes, ${comments[index]} comments`
          }
          summary={`Last ${range} days: ${total(reads)} reads, ${total(votes)} votes, ${total(comments)} comments`}
          text={{
            chartLabel: (series) => `${series} by day`,
            hint: "Use the left and right arrows to move through the days.",
            latest: (day) => `Latest: ${day}`,
            average: "avg",
            showTable: "Show as a table",
            hideTable: "Hide the table",
            tableCaption: `Daily figures, last ${range} days`,
            dayColumn: "Day",
            noteColumn: "Published",
          }}
        />
        <FunnelSteps
          steps={funnelSteps(range)}
          label="Readers by chapter"
          summary={`Of the readers who started in the last ${range} days, how many reached each chapter.`}
          highlightLabel="biggest drop"
          showAllLabel={(count) => `Show all ${count} chapters`}
          showFewerLabel="Show fewer"
        />
      </div>
    </div>
  );
}

const STORY_URL = "https://storynest.example/s/the-lighthouse-keeper-8f3k2";

const ACCESS_OPTIONS: readonly ShareAccessOption<"private" | "link" | "public">[] = [
  { value: "private", label: "Only you", description: "Nobody else can open the link.", icon: Lock, reachable: false },
  {
    value: "link",
    label: "Anyone with the link",
    description: "Not listed, but the link opens it.",
    icon: Link2,
    reachable: true,
  },
  {
    value: "public",
    label: "Everyone",
    description: "Listed on your profile and in search.",
    icon: Globe,
    reachable: true,
  },
];

function SharingExample() {
  const toast = useAppToast();
  const [access, setAccess] = useState<"private" | "link" | "public">("link");
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <CopyLinkButton
        value={STORY_URL}
        label="Copy link"
        copiedLabel="Copied"
        onCopyFailed={() => toast.error("Copy failed")}
      />
      <CopyLinkButton
        value={STORY_URL}
        label="Copy link"
        copiedLabel="Copied"
        iconOnly
        onCopyFailed={() => toast.error("Copy failed")}
      />
      <ShareDialog
        trigger={<Button variant="outline">Share (with access)</Button>}
        title="Share “The Lighthouse Keeper”"
        description="Anyone you send the link to can read the published chapters."
        url={STORY_URL}
        linkLabel="Story link"
        copyLabel="Copy"
        copiedLabel="Copied"
        access={{
          label: "Who can open it",
          value: access,
          options: ACCESS_OPTIONS,
          pending,
          onChange: (value) => {
            setPending(true);
            setTimeout(() => {
              setAccess(value);
              setPending(false);
            }, 300);
          },
        }}
        nativeShare={{ label: "Share via…", onShare: () => toast.info("System share sheet") }}
      />
      <ShareDialog
        trigger={<Button variant="outline">Share (link only)</Button>}
        title="Share this chapter"
        description="Copy the link to send it."
        url={`${STORY_URL}/chapter-3`}
        linkLabel="Chapter link"
        copyLabel="Copy"
        copiedLabel="Copied"
      />
    </div>
  );
}

const LONG_TEXT =
  "Mara has kept the lighthouse on Gull Rock for eleven winters, long enough to know every mood of the sea and every lie the fog tells. When a ship that sank forty years ago appears on the horizon, lamps lit and sails full, she is the only one who sees it. The harbour town calls it a trick of the light. The old fishermen stop talking when she walks into the tavern. And the letters she finds in the keeper's desk, written in her own hand and dated long before she was born, suggest that this is not the first time the ship has come back for her. As the storms grow worse and the ship draws closer each night, Mara has to decide whether to keep the light burning or to let it go dark and find out what the sea has been waiting for.";

function ReadingExample() {
  const [enabled, setEnabled] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Long text (clamped to 4 lines)</p>
          <ExpandableText lines={4} moreLabel="Show more" lessLabel="Show less" className="text-sm leading-relaxed">
            <p>{LONG_TEXT}</p>
          </ExpandableText>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Short text (no toggle)</p>
          <ExpandableText lines={4} moreLabel="Show more" lessLabel="Show less" className="text-sm leading-relaxed">
            <p>A short synopsis that fits.</p>
          </ExpandableText>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={enabled} onCheckedChange={setEnabled} /> Sticky action bar: scroll these buttons off the top
          to see it rise
        </label>
        <div ref={anchorRef} data-slot="sticky-anchor" className="flex flex-wrap gap-2">
          <Button>Start reading</Button>
          <Button variant="outline">Add to library</Button>
        </div>
        {enabled ? (
          <StickyActionBar anchorRef={anchorRef} label="Story actions">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">The Lighthouse Keeper</p>
            <Button size="sm" variant="outline">
              Add to library
            </Button>
            <Button size="sm">Start reading</Button>
          </StickyActionBar>
        ) : null}
      </div>
    </div>
  );
}

const FIND_TEXT =
  "The keeper climbed the stairs. At the top, the keeper lit the lamp, and the Keeper's shadow fell across the sea.";

const FIND_LABELS = {
  region: "Find and replace",
  find: "Find",
  replace: "Replace with",
  caseSensitive: "Match case",
  previous: "Previous match",
  next: "Next match",
  replaceOne: "Replace",
  replaceAll: "Replace all",
  close: "Close",
};

function matchesOf(text: string, find: string, caseSensitive: boolean): number[] {
  if (find === "") return [];
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? find : find.toLowerCase();
  const found: number[] = [];
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) found.push(at);
  return found;
}

/** A tiny host for the presentational find bar: plain string search over one paragraph. */
function FindReplaceExample() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(FIND_TEXT);
  const [find, setFind] = useState("keeper");
  const [replace, setReplace] = useState("warden");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);
  const matches = matchesOf(text, find, caseSensitive);
  const total = matches.length;
  const current = total === 0 ? 0 : Math.min(index, total - 1) + 1;
  const move = (step: 1 | -1) => {
    if (total === 0) return;
    const next = (current - 1 + step + total) % total;
    setIndex(next);
    setStatus(`${next + 1} of ${total}`);
  };
  const replaceAt = (at: number) => text.slice(0, at) + replace + text.slice(at + find.length);
  const at = matches[current - 1];
  return (
    <div className="flex max-w-xl flex-col gap-3">
      {open ? (
        <FindReplaceBar
          find={find}
          replace={replace}
          caseSensitive={caseSensitive}
          current={current}
          total={total}
          status={status || (total === 0 ? "No matches" : `${current} of ${total}`)}
          focusRequest={focusRequest}
          labels={FIND_LABELS}
          onFindChange={(value) => {
            setFind(value);
            setIndex(0);
          }}
          onReplaceChange={setReplace}
          onCaseSensitiveChange={setCaseSensitive}
          onNext={() => move(1)}
          onPrevious={() => move(-1)}
          onReplace={() => {
            if (at === undefined) return;
            setText(replaceAt(at));
            setStatus("1 replaced");
          }}
          onReplaceAll={() => {
            setText(
              caseSensitive
                ? text.replaceAll(find, replace)
                : text.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), replace),
            );
            setStatus(`${total} replaced`);
          }}
          onClose={() => setOpen(false)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => {
            setOpen(true);
            setFocusRequest((value) => value + 1);
          }}
        >
          Open find and replace
        </Button>
      )}
      <p data-slot="find-text" className="font-reader text-sm leading-relaxed">
        {at === undefined ? (
          text
        ) : (
          <>
            {text.slice(0, at)}
            <mark className="rounded-xs bg-primary/20 text-foreground">{text.slice(at, at + find.length)}</mark>
            {text.slice(at + find.length)}
          </>
        )}
      </p>
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setText(FIND_TEXT)}>
        Reset text
      </Button>
    </div>
  );
}

const MERGE_CONFLICTS = [
  {
    label: "Paragraph 2",
    mine: "The fog rolled in at dusk, thick as wool, and swallowed the harbour whole.",
    theirs: "The fog came in at dusk and swallowed the harbour.",
  },
  {
    label: "Paragraph 5",
    mine: "She did not light the lamp that night.",
    theirs: "She lit the lamp, as she had every night for eleven years, and waited.",
  },
];

function MergeChoiceExample() {
  const [chosen, setChosen] = useState<Record<string, "mine" | "server" | undefined>>({});
  return (
    <div className="flex max-w-xl flex-col gap-4">
      {MERGE_CONFLICTS.map((conflict) => (
        <MergeChoice
          key={conflict.label}
          label={conflict.label}
          chosen={chosen[conflict.label]}
          onChoose={(side) => setChosen((current) => ({ ...current, [conflict.label]: side }))}
          options={[
            { side: "mine", label: "This copy (unsaved)", content: conflict.mine },
            { side: "server", label: "Saved version", content: conflict.theirs },
          ]}
        />
      ))}
    </div>
  );
}

const OUTBOX_INITIAL = [
  {
    key: "ch6",
    title: "Chapter 6: The Lamp",
    meta: "Lighthouse Keeper · 3,240 words",
    when: "in 3 hours",
    detail: "5 Nov 2026, 18:30 (UTC)",
  },
  {
    key: "ch7",
    title: "Chapter 7: Return of the Very Long Titled Ship That Nobody Expected",
    meta: "Lighthouse Keeper · 2,980 words",
    when: "tomorrow",
    detail: "6 Nov 2026, 09:00 (UTC)",
  },
  {
    key: "ann",
    title: "Announcement: holiday schedule",
    meta: "Profile post",
    when: "in 4 days",
    detail: "9 Nov 2026, 12:00 (UTC)",
  },
];

function ScheduledOutboxExample() {
  const toast = useAppToast();
  const [items, setItems] = useState(OUTBOX_INITIAL);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("2026-11-07T10:00");
  return (
    <ScheduledOutbox title="Scheduled" description="Goes out automatically at the time shown." className="max-w-xl">
      {items.map((item, index) => (
        <ScheduledOutboxItem
          key={item.key}
          when={item.when}
          whenDetail={item.detail}
          editLabel={`Change the time of ${item.title}`}
          editing={editing === item.key}
          onEditingChange={(open) => setEditing(open ? item.key : null)}
          editable={index !== 2}
          editor={
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="datetime-local"
                aria-label="New time"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="w-auto"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setItems((current) =>
                    current.map((entry) =>
                      entry.key === item.key
                        ? { ...entry, when: "rescheduled", detail: `${draft.replace("T", ", ")} (UTC)` }
                        : entry,
                    ),
                  );
                  setEditing(null);
                }}
              >
                Save time
              </Button>
            </div>
          }
          title={item.title}
          meta={item.meta}
          actions={
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => toast.success(`Published ${item.title}`)}
              >
                Publish now
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => toast.info("Unscheduled")}>
                Unschedule
              </Button>
            </>
          }
          notice={
            index === 1 ? (
              <p className="text-xs text-destructive">Could not reschedule: the chapter has unsaved changes.</p>
            ) : undefined
          }
        />
      ))}
    </ScheduledOutbox>
  );
}

// Batch 2 · stats: brush-to-zoom on the small multiples (Lucian 170) and the reads heatmap (Lucian 151), on the demo data
// above. The screen builds the heatmap from the feature model (weekColumns, heatLevel, heatLegend); this demo lays the
// same 90 days out by hand.
const BATCH2_ZOOM_TEXT = {
  zoomIn: "Zoom in",
  reset: "Show all",
  selection: (from: string, to: string, days: number) => `Selected ${from} – ${to}, ${days} days. Release to zoom in.`,
  zoomed: (from: string, to: string, days: number, total: number) =>
    `Showing ${from} – ${to}: ${days} of ${total} days.`,
};

function batch2HeatLevel(value: number, max: number): HeatLevel {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) as HeatLevel;
}

function Batch2StatsExample() {
  const [range, setRange] = useState<Range>(30);
  const days = ALL_DAYS.slice(-range);
  const reads = SERIES.reads.slice(-range);
  const votes = SERIES.votes.slice(-range);
  const comments = SERIES.comments.slice(-range);
  const signed = new Intl.NumberFormat("en", { signDisplay: "exceptZero" });

  const max = Math.max(...SERIES.reads);
  const offset = (new Date(`${ALL_DAYS[0]?.key}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday first
  const weeks = Math.ceil((offset + ALL_DAYS.length) / 7);
  const columns = Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday): HeatmapCell | null => {
      const index = week * 7 + weekday - offset;
      const day = ALL_DAYS[index];
      if (!day) return null;
      const value = SERIES.reads[index] ?? 0;
      return {
        key: day.key,
        level: batch2HeatLevel(value, max),
        label: `${day.label}: ${value} reads, ${SERIES.votes[index]} likes, ${SERIES.comments[index]} comments`,
        valueText: value.toLocaleString("en"),
      };
    }),
  );
  const columnLabels = columns.map((column, week) => {
    const first = column.find((cell) => cell !== null);
    const monthStart = column.find((cell) => cell?.key.endsWith("-01"));
    const label = monthStart ?? (week === 0 ? first : undefined);
    return {
      short: label ? new Date(`${label.key}T00:00:00Z`).toLocaleString("en", { month: "short", timeZone: "UTC" }) : "",
      long: `Week ${week + 1}`,
    };
  });
  const quarter = (level: number) => Math.floor((max * level) / 4);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Tabs value={String(range)} onValueChange={(value) => setRange(Number(value) as Range)}>
          <TabsList aria-label="Range">
            {RANGES.map((option) => (
              <TabsTrigger key={option} value={String(option)}>
                {`${option} days`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SyncedSmallMultiples
          days={days}
          slots={STATS_DAYS}
          series={[
            { key: "reads", label: "Reads", values: reads, tone: 1 },
            { key: "votes", label: "Likes", values: votes, tone: 2 },
            { key: "comments", label: "Comments", values: comments, tone: 3 },
          ]}
          formatValue={(value) => value.toLocaleString("en")}
          formatDelta={(delta) => signed.format(delta)}
          describeDay={(index) =>
            `${days[index]?.label}: ${reads[index]} reads, ${votes[index]} likes, ${comments[index]} comments`
          }
          summary={`Last ${range} days of reads, likes and comments`}
          text={{
            chartLabel: (series) => `${series} by day`,
            hint: "Use the left and right arrows to move through the days; hold Shift to select days, then Enter to zoom in.",
            latest: (day) => `Latest: ${day}`,
            average: "avg",
            showTable: "Show as a table",
            hideTable: "Hide the table",
            tableCaption: `Daily figures, last ${range} days`,
            dayColumn: "Day",
            noteColumn: "Published",
            zoom: BATCH2_ZOOM_TEXT,
          }}
        />
      </div>
      <CalendarHeatmap
        columns={columns}
        rows={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((label, index) => ({
          label,
          abbr: label.slice(0, 3),
          showLabel: index % 2 === 0 && index < 5,
        }))}
        columnLabels={columnLabels}
        legend={[
          { level: 0, label: "0" },
          ...([1, 2, 3, 4] as const).map((level) => ({
            level,
            label: `${quarter(level - 1) + 1}–${quarter(level)}`,
          })),
        ]}
        label="Reads per day over the last 90 days, one column per week"
        summary={`90 days: ${SERIES.reads.reduce((sum, value) => sum + value, 0).toLocaleString("en")} reads. Pick a square to see that day.`}
        text={{
          hint: "Use up and down to move one day, left and right to move one week.",
          legend: "Reads per day",
          showTable: "Show reads by week as a table",
          hideTable: "Hide the weekly table",
          tableCaption: "Reads per day by week",
          columnHeader: "Week",
        }}
      />
    </div>
  );
}

// Batch 2 · browse: demos for the discover / search / library / author widgets.
const BROWSE_CARD_LABELS = { reads: "Reads", votes: "Votes", updated: (relative: string) => `Updated ${relative}` };

function browseStory(index: number): StoryCardData {
  return {
    href: `/dev/gallery#story-${index}`,
    title: DEMO_TITLES[index % DEMO_TITLES.length]!,
    authorName: ["An Nhiên", "Minh Thư", "Bảo Lâm"][index % 3]!,
    synopsis:
      "A lighthouse keeper finds a letter that arrived forty years late, and follows it up the coast through three storms and one wedding.",
    coverUrl: index % 4 === 3 ? null : demoCoverUrl(index),
    categoryName: ["Fantasy", "Romance", "Mystery"][index % 3]!,
    statusLabel: index % 2 ? "Completed" : "Ongoing",
    reads: 1200 + index * 731,
    votes: 40 + index * 13,
    updatedAt: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
  };
}

function BrowseHeaderSearchExample() {
  return (
    <div className="relative flex h-14 items-center gap-3 rounded-xl border px-4">
      <span className="font-semibold tracking-tight">StoryNest</span>
      <div className="ml-auto flex w-full max-w-sm items-center justify-end gap-2">
        <SearchBox />
        <Button type="button" size="icon" variant="ghost" aria-label="Notifications">
          <Heart aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function BrowseRollingExample() {
  const [votes, setVotes] = useState(1204);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" onClick={() => setVotes((n) => n + 1)}>
        Vote +1
      </Button>
      <Button type="button" variant="outline" onClick={() => setVotes((n) => Math.max(0, n - 37))}>
        −37
      </Button>
      <Button type="button" variant="outline" onClick={() => setVotes((n) => n + 98_765)}>
        +98,765
      </Button>
      <RollingNumber value={votes} format={(n) => `${n.toLocaleString("en")} votes`} live className="text-sm" />
      <RollingNumber value={votes} format={(n) => `${n} followers`} className="text-2xl font-semibold" />
    </div>
  );
}

function BrowseFeaturedExample() {
  return (
    <FeaturedCarousel
      title="Featured this week"
      labels={{
        pause: "Pause auto-advance",
        play: "Resume auto-advance",
        dots: "Choose a featured story",
        slide: (index, count) => `Story ${index + 1} of ${count}: ${DEMO_TITLES[index]}`,
      }}
    >
      {[0, 1, 2, 3].map((index) => {
        const story = browseStory(index);
        return (
          <a
            key={story.title}
            href={story.href}
            className="flex gap-4 rounded-2xl border bg-card p-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <StoryCover title={story.title} coverUrl={story.coverUrl} className="w-28 shrink-0 self-start" />
            <span className="flex min-w-0 flex-col gap-2">
              <span className="text-lg leading-snug font-semibold">{story.title}</span>
              <span className="text-sm text-muted-foreground">{story.authorName}</span>
              <span className="line-clamp-3 text-sm text-muted-foreground">{story.synopsis}</span>
            </span>
          </a>
        );
      })}
    </FeaturedCarousel>
  );
}

function BrowseGridExample() {
  const toast = useAppToast();
  const frame = useRef<HTMLDivElement>(null);
  const capture = useFlip(frame);
  const [view, setView] = useStoredView("storynest.gallery-view");
  const [peek, setPeek] = useState<StoryCardData | null>(null);
  const stories = [0, 1, 2, 3, 4, 5].map(browseStory);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Right-click or long-press a card for the quick look.</p>
        <StoryViewToggle
          value={view}
          onChange={(next) => {
            capture();
            setView(next);
          }}
          labels={{ label: "Display", grid: "Grid", list: "List" }}
        />
      </div>
      <div ref={frame} className="group/stories">
        <ul
          className={
            view === "list"
              ? "grid grid-cols-1 gap-3 lg:grid-cols-2"
              : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          }
        >
          {stories.map((story) => (
            <li key={story.href}>
              <StoryCard
                story={story}
                labels={BROWSE_CARD_LABELS}
                LinkComponent={AppLink}
                locale="en"
                variant={view}
                onPeek={() => setPeek(story)}
              />
            </li>
          ))}
        </ul>
      </div>
      <StoryPeekSheet
        story={peek}
        open={peek !== null}
        onOpenChange={(open) => !open && setPeek(null)}
        LinkComponent={AppLink}
        locale="en"
        labels={{ reads: "Reads", votes: "Votes", open: "Open story", close: "Close quick look" }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => toast.success("Following")}>
              Follow
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.success("Saved")}>
              Save to library
            </Button>
          </div>
        }
      />
    </div>
  );
}

// ---- Batch 2 · manage: row context menu, bulk dock, drag reorder with flying rows, diff folds, detail panel --------

const MANAGE_ROWS = [
  { id: "m1", title: "Chapter 1: The Lamp Room", status: "Published" },
  { id: "m2", title: "Chapter 2: Salt on the Glass", status: "Published" },
  { id: "m3", title: "Chapter 3: A Ship Without Lights, and a Title Long Enough to Wrap", status: "Draft" },
  { id: "m4", title: "Chapter 4: Low Tide", status: "Archived" },
  { id: "m5", title: "Chapter 5: Keeper's Log", status: "Draft" },
];

function ManageListExample() {
  const toast = useAppToast();
  const [rows, setRows] = useState(MANAGE_ROWS);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const ids = rows.map((row) => row.id);
  const reorderTo = (next: string[]) =>
    setRows((current) => next.flatMap((id) => current.find((row) => row.id === id) ?? []));
  const sortable = useSortableList({ ids, onReorder: reorderTo });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const move = (id: string, direction: 1 | -1) => {
    const from = ids.indexOf(id);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    reorderTo(next);
  };
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <ol ref={sortable.listRef} aria-label="Demo chapters" className="relative flex flex-col gap-2">
        {sortable.order.map((id, index) => {
          const row = byId.get(id);
          if (!row) return null;
          const actions: RowAction[] = [
            { id: "up", label: "Move up", disabled: index === 0, onSelect: () => move(id, -1) },
            { id: "down", label: "Move down", disabled: index === ids.length - 1, onSelect: () => move(id, 1) },
            { id: "rename", label: "Rename", onSelect: () => toast.info(`Rename ${row.title}`) },
            { id: "archive", label: "Archive", onSelect: () => toast.info(`Archive ${row.title}`) },
            {
              id: "delete",
              label: "Delete",
              destructive: true,
              separated: true,
              onSelect: () => toast.info(`Delete ${row.title}`),
            },
          ];
          const checked = selected.has(id);
          return (
            <RowActionsMenu key={id} actions={actions} label={row.title}>
              <SortableItem
                sortable={sortable}
                id={id}
                data-selected={checked || undefined}
                className="flex items-start gap-1.5 rounded-xl border bg-card p-2 text-card-foreground select-none group-data-[selected]/sortable:border-primary group-data-[selected]/sortable:bg-accent group-data-[state=open]/sortable:ring-2 group-data-[state=open]/sortable:ring-primary sm:gap-2 sm:p-3"
              >
                <DragHandle sortable={sortable} id={id} className="-my-1" />
                <span className="flex h-6 items-center sm:h-11">
                  <Checkbox
                    checked={checked}
                    aria-label={`Select ${row.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      setSelected((current) => {
                        const next = new Set(current);
                        if (!next.delete(id)) next.add(id);
                        return next;
                      });
                    }}
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Chapter {index + 1}</p>
                    <p className="truncate text-sm font-medium">{row.title}</p>
                    <Badge variant="outline" className="mt-1">
                      {row.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => move(id, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={index === ids.length - 1}
                      onClick={() => move(id, 1)}
                    >
                      Down
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="hidden sm:inline-flex">
                      Rename
                    </Button>
                    <RowActionsButton
                      actions={actions.slice(2)}
                      label={`More actions: ${row.title}`}
                      menuLabel={row.title}
                    />
                  </div>
                </div>
              </SortableItem>
            </RowActionsMenu>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Right-click, long-press or Shift+F10 a row for its menu; drag the grip to reorder.
      </p>
      <BulkActionDock
        count={selected.size}
        summary={`${selected.size} selected`}
        label="Bulk actions"
        clearLabel="Clear selection"
        onClear={() => setSelected(new Set())}
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            toast.success(`Archived ${selected.size}`);
            setSelected(new Set());
          }}
        >
          Archive ({selected.size})
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={() => toast.error("1 could not be deleted")}>
          Delete ({selected.size})
        </Button>
      </BulkActionDock>
    </div>
  );
}

const GRID_STORIES = ["The Lighthouse Keeper", "Salt Roads", "Glass Harbour", "Nine Lanterns", "Low Tide", "Kestrel"];

function ManageGridExample() {
  const [order, setOrder] = useState(GRID_STORIES);
  const sortable = useSortableList({ ids: order, onReorder: setOrder, layout: "grid" });
  return (
    <ul
      ref={sortable.listRef}
      aria-label="Demo reading list"
      className="relative grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {sortable.order.map((title, index) => (
        <SortableItem key={title} sortable={sortable} id={title} className="flex flex-col gap-2">
          <div className="flex aspect-[3/2] items-end rounded-lg border bg-muted p-2 text-sm font-medium">{title}</div>
          <div className="flex items-center gap-1">
            <DragHandle sortable={sortable} id={title} />
            <span className="text-xs text-muted-foreground">#{index + 1}</span>
          </div>
        </SortableItem>
      ))}
    </ul>
  );
}

type DemoEntry = { key: string; kind: "same" | "added" | "removed" | "changed"; text: string };
const DIFF_DEMO: DemoEntry[] = [
  { key: "p1", kind: "same", text: "The lamp was lit at dusk, as it had been every night for forty years." },
  { key: "p2", kind: "same", text: "Mara climbed the hundred and twelve steps with the oil can." },
  { key: "p3", kind: "changed", text: "Below, the sea was flat and grey and very quiet." },
  { key: "p4", kind: "same", text: "She checked the wick, then the glass, then the wick again." },
  { key: "p5", kind: "same", text: "Gulls argued on the gallery rail." },
  { key: "p6", kind: "same", text: "Far out, a light answered hers, where no light should be." },
  { key: "p7", kind: "added", text: "It blinked twice, and went dark." },
  { key: "p8", kind: "removed", text: "She went back down to make tea." },
  { key: "p9", kind: "same", text: "That night she did not sleep." },
];

function DiffFoldsExample() {
  const [only, setOnly] = useState(false);
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set());
  const [current, setCurrent] = useState(-1);
  const refs = useRef(new Map<number, HTMLElement>());
  // Runs: consecutive same entries / consecutive changes.
  const runs: { same: boolean; entries: DemoEntry[]; change: number }[] = [];
  for (const entry of DIFF_DEMO) {
    const same = entry.kind === "same";
    const last = runs.at(-1);
    if (last && last.same === same) last.entries.push(entry);
    else runs.push({ same, entries: [entry], change: same ? -1 : runs.filter((run) => !run.same).length });
  }
  const total = runs.filter((run) => !run.same).length;
  const step = (index: number) => {
    setCurrent(index);
    refs.current.get(index)?.scrollIntoView({ block: "center" });
    refs.current.get(index)?.focus({ preventScroll: true });
  };
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={only}
            onCheckedChange={(checked) => {
              setOnly(checked);
              setOpened(new Set());
            }}
          />
          Only show changes
        </label>
        <ChangeStepper
          current={current}
          total={total}
          status={current < 0 ? `${total} changes` : `Change ${current + 1} of ${total}`}
          previousLabel="Previous change"
          nextLabel="Next change"
          onStep={step}
        />
      </div>
      <ul aria-label="Demo comparison" className="reader-text -mt-[1em] flex flex-col">
        {runs.flatMap((run, runIndex) => {
          if (run.same) {
            const folded = only && !opened.has(runIndex);
            const ids = run.entries.map((entry) => `demo-fold-${entry.key}`);
            const rows = run.entries.map((entry, index) => (
              <FoldRow key={entry.key} id={ids[index]} folded={folded}>
                <p className="pt-[1em]">{entry.text}</p>
              </FoldRow>
            ));
            return only
              ? [
                  <li key={`fold-${runIndex}`}>
                    <div className="pt-[1em]">
                      <FoldToggle
                        expanded={!folded}
                        controls={ids.join(" ")}
                        onToggle={() =>
                          setOpened((now) => {
                            const next = new Set(now);
                            if (!next.delete(runIndex)) next.add(runIndex);
                            return next;
                          })
                        }
                      >
                        {folded
                          ? `${run.entries.length} unchanged paragraphs`
                          : `Hide ${run.entries.length} unchanged paragraphs`}
                      </FoldToggle>
                    </div>
                  </li>,
                  ...rows,
                ]
              : rows;
          }
          return run.entries.map((entry, index) => (
            <li key={entry.key}>
              <div className="pt-[1em]">
                <div
                  ref={
                    index === 0
                      ? (element) => {
                          if (element) refs.current.set(run.change, element);
                        }
                      : undefined
                  }
                  tabIndex={index === 0 ? -1 : undefined}
                  data-current={run.change === current || undefined}
                  className={`rounded-r-md border-l-4 pl-3 outline-none data-[current]:bg-accent/60 ${
                    index === 0 ? "motion-safe:data-[current]:animate-hunk-nudge" : ""
                  } ${entry.kind === "removed" ? "border-destructive line-through opacity-70" : "border-primary"}`}
                >
                  <Badge variant={entry.kind === "removed" ? "destructive" : "secondary"} className="mb-1">
                    {entry.kind}
                  </Badge>
                  <p>{entry.text}</p>
                </div>
              </div>
            </li>
          ));
        })}
      </ul>
    </div>
  );
}

const PANEL_REPORTS = [
  { id: "r1", title: "Insulting comment under chapter 4", kind: "Comment", reason: "Harassment", by: "reader_ana" },
  { id: "r2", title: "Copied story: Salt Roads", kind: "Story", reason: "Copyright", by: "kestrel" },
  { id: "r3", title: "Spam account linking to a shop", kind: "Account", reason: "Spam", by: "mara.k" },
  { id: "r4", title: "Graphic violence without a mature flag", kind: "Chapter", reason: "Violence", by: "lumen" },
];

function DetailPanelExample() {
  const toast = useAppToast();
  const [at, setAt] = useState<{ index: number; direction: -1 | 0 | 1 } | null>(null);
  const [open, setOpen] = useState(false);
  const report = at ? PANEL_REPORTS[at.index] : undefined;
  const show = (index: number, direction: -1 | 0 | 1) => {
    setAt({ index, direction });
    setOpen(true);
  };
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {PANEL_REPORTS.map((item, index) => (
          <li key={item.id}>
            <article
              aria-label={item.title}
              aria-current={(open && at?.index === index) || undefined}
              className="flex flex-col gap-2 rounded-xl border p-3 aria-[current]:border-primary aria-[current]:bg-accent/60"
            >
              <span className="flex gap-2">
                <Badge variant="secondary">{item.kind}</Badge>
                <Badge variant="outline">{item.reason}</Badge>
              </span>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => show(index, 0)}
                className="w-fit text-left text-sm font-medium underline-offset-4 hover:underline"
              >
                {item.title}
              </button>
            </article>
          </li>
        ))}
      </ul>
      {report && at ? (
        <DetailPanel
          open={open}
          onOpenChange={setOpen}
          title={report.title}
          description="J / K: next / previous report · Esc: close"
          position={`${at.index + 1} of ${PANEL_REPORTS.length}`}
          hasPrevious={at.index > 0}
          hasNext={at.index < PANEL_REPORTS.length - 1}
          onPrevious={() => show(at.index - 1, -1)}
          onNext={() => show(at.index + 1, 1)}
          previousLabel="Previous report"
          nextLabel="Next report"
          closeLabel="Close details"
          contentKey={report.id}
          direction={at.direction}
        >
          <div className="flex gap-2">
            <Badge variant="secondary">{report.kind}</Badge>
            <Badge variant="outline">{report.reason}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Reported by {report.by} · 2 hours ago</p>
          <Textarea placeholder="Typing j or k here does not switch reports" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="destructive" onClick={() => toast.info("Hide")}>
              Hide
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => toast.info("Resolve")}>
              Mark resolved
            </Button>
          </div>
        </DetailPanel>
      ) : null}
    </div>
  );
}

const ACCOUNT_PEOPLE: AutocompleteOption[] = [
  { id: "1", value: "annguyen", primary: "An Nguyễn", secondary: "@annguyen" },
  { id: "2", value: "anhtran", primary: "Anh Trần", secondary: "@anhtran" },
  { id: "3", value: "binhle", primary: "Bình Lê", secondary: "@binhle" },
  { id: "4", value: "chi_writes", primary: "Chi Phạm", secondary: "@chi_writes" },
].map((person) => ({
  ...person,
  leading: (
    <Avatar className="size-8">
      <AvatarFallback>{person.primary.slice(0, 1)}</AvatarFallback>
    </Avatar>
  ),
}));

/** Rough demo scoring only; the real rules live in features/auth (passwordStrength). */
function demoStrength(value: string): StrengthScore {
  if (value === "") return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (value.length < 8) return 1;
  return Math.min(4, Math.max(1, variety + (value.length >= 12 ? 1 : 0) - 1)) as StrengthScore;
}

function AccountBatchExample() {
  const [night, setNight] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropped, setDropped] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [password, setPassword] = useState("");
  const [sends, setSends] = useState(0);
  const cooldown = useCountdown(10);
  const [email, setEmail] = useState("an@gmial.com");
  const [connection, setConnection] = useState<ConnectionState>("online");
  const [connectionChanged, setConnectionChanged] = useState(false);
  const matches = who.trim() === "" ? [] : ACCOUNT_PEOPLE.filter((p) => p.value.includes(who.trim().toLowerCase()));
  const score = demoStrength(password);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <SkySwitch night={night} onNightChange={setNight} label="Night sky (demo)" />
        <span className="text-sm text-muted-foreground">
          {night ? "Night" : "Day"} · demo only, the site theme stays
        </span>
        <FullScreenMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title="Menu"
          openLabel="Open menu"
          closeLabel="Close menu"
          footer={<span className="text-sm text-muted-foreground">Footer row</span>}
        >
          <ul className="flex flex-col">
            {["Rankings", "Following"].map((label, index) => (
              <li key={label}>
                <a
                  href="#batch2-account"
                  className={fullScreenMenuLinkClass()}
                  style={fullScreenMenuItemStyle(index)}
                  onClick={() => setMenuOpen(false)}
                >
                  <span aria-hidden className="text-xs text-muted-foreground">
                    0{index + 1}
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </FullScreenMenu>
      </div>

      <DropZone
        label="Drop the picture here"
        onFiles={(files) => setDropped(files[0]?.name ?? null)}
        className="max-w-sm"
      >
        <div className="flex items-center gap-3 rounded-xl border p-3">
          <StoryCover title="Drop target" coverUrl={null} className="w-14 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {dropped ? `Dropped: ${dropped}` : "Drag a file onto this row."}
          </p>
        </div>
      </DropZone>

      <div className="flex max-w-sm flex-col gap-1.5">
        <label htmlFor="gallery-invite" className="text-sm font-medium">
          Invite by username
        </label>
        <AutocompleteInput
          id="gallery-invite"
          value={who}
          onValueChange={setWho}
          options={matches}
          listLabel="Suggested authors"
          emptyText="No author matches. You can still invite by the exact username."
        />
      </div>

      <div className="flex max-w-sm flex-col gap-2">
        <label htmlFor="gallery-password" className="text-sm font-medium">
          New password
        </label>
        <Input id="gallery-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {password ? (
          <PasswordStrengthMeter
            score={score}
            title="Strength"
            note="advice only"
            levelLabel={["", "Weak", "Fair", "Good", "Strong"][score] ?? ""}
            metLabel="done"
            checks={[
              { id: "length", label: "At least 8 characters", met: password.length >= 8 },
              {
                id: "case",
                label: "Upper and lower case letters",
                met: /[a-z]/.test(password) && /[A-Z]/.test(password),
              },
              { id: "number", label: "A number", met: /\d/.test(password) },
              { id: "symbol", label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
            ]}
            hints={/1234|abcd/i.test(password) ? ["Avoid runs like 1234 or abcd."] : []}
          />
        ) : null}
      </div>

      <div className="flex max-w-sm flex-col gap-3 rounded-xl border p-4 text-center">
        {sends > 0 ? <EnvelopeSent key={sends} /> : <p className="text-sm text-muted-foreground">Nothing sent yet.</p>}
        <Button
          type="button"
          onClick={() => {
            setSends((count) => count + 1);
            cooldown.restart();
          }}
        >
          Send the email
        </Button>
        <ResendButton
          secondsLeft={cooldown.left}
          total={10}
          label="Resend email"
          waitingLabel={(seconds) => `Resend in ${seconds} s`}
          onResend={() => {
            setSends((count) => count + 1);
            cooldown.restart();
          }}
        />
      </div>

      <div className="flex max-w-sm flex-col gap-1.5">
        <label htmlFor="gallery-email" className="text-sm font-medium">
          Email
        </label>
        <Input id="gallery-email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <div aria-live="polite">
          {email.endsWith("@gmial.com") ? (
            <EmailTypoHint
              className="mt-1"
              suggestion={{ head: `${email.slice(0, email.indexOf("@"))}@gm`, changed: "ai", tail: "l.com" }}
              before="Did you mean"
              after="?"
              onAccept={() => setEmail(email.replace("@gmial.com", "@gmail.com"))}
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border pt-2">
        <ConnectionBanner
          state={connection}
          animate={connectionChanged}
          labels={{
            offlineTitle: "You are offline",
            offlineBody: "New content will load again once you are back online.",
            backTitle: "Back online",
            backBody: "Reloading what failed.",
          }}
        />
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {(["offline", "back", "online"] as const).map((state) => (
            <Button
              key={state}
              type="button"
              size="sm"
              variant={connection === state ? "secondary" : "outline"}
              onClick={() => {
                setConnectionChanged(true);
                setConnection(state);
              }}
            >
              {state}
            </Button>
          ))}
        </div>
      </div>

      <PullToRefresh
        enabled
        onRefresh={() => new Promise((resolve) => setTimeout(resolve, 1200))}
        labels={{ pull: "Pull down to refresh", release: "Release to refresh", refreshing: "Refreshing…" }}
      >
        <p className="rounded-xl border p-3 text-sm text-muted-foreground">
          Pull to refresh: on a touch screen, at the top of the page, drag down (enabled here for the demo; the app only
          turns it on in the installed app).
        </p>
      </PullToRefresh>
    </div>
  );
}

const QUOTE_PARAGRAPHS = [
  "The fog came in before dawn, the way it always did in the last week of autumn, and by the time Mara reached the top of the stairs the lamp room was an island in a white sea.",
  "She lit the wick, wound the clockwork and stood at the glass until the beam found its rhythm. Somewhere below, a bell answered that no one had rung in forty years.",
];

function ReaderToolsExample() {
  const [ratio, setRatio] = useState(0.35);
  const [sweeps, setSweeps] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const { selection, clear } = useBlockSelection(container, toolbar);
  const words = 2400;
  const minutes = Math.max(1, Math.ceil((words * (1 - ratio)) / 200));
  const done = ratio >= 0.985;

  return (
    <div className="flex flex-col gap-6" data-slot="reader-tools-demo">
      <div className="flex flex-wrap items-center gap-4">
        <ReadingTimeLeft
          ratio={ratio}
          done={done}
          label={done ? "Finished" : `${minutes} min left`}
          shortLabel={done ? "Finished" : `${minutes} min`}
        />
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          Read
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(ratio * 100)}
            onChange={(event) => setRatio(Number(event.target.value) / 100)}
            className="min-w-0 flex-1 accent-primary"
            aria-label="Share of the chapter read"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Select words inside one paragraph for the quote tools. The second paragraph is the deep-link target.
        </p>
        <div ref={container} className="reader-text flex max-w-[var(--reader-measure)] flex-col gap-[1em]">
          {QUOTE_PARAGRAPHS.map((text, index) => (
            <p key={text} data-block-id={`demo-${index}`}>
              <HighlightSweep play={index === 1 ? sweeps : 0}>{text}</HighlightSweep>
            </p>
          ))}
        </div>
        <SelectionToolbar rect={selection?.rect ?? null} label="Quote tools" onDismiss={clear} toolbarRef={toolbar}>
          {selection ? (
            <>
              <CopyLinkButton
                value={() =>
                  `“${selection.text}”\n— The Lighthouse Keeper, Chapter 2\nhttps://storynest.example/s/1#b-${selection.blockId}`
                }
                label="Copy quote"
                copiedLabel="Copied"
                variant="ghost"
                size="sm"
                onCopied={() => setTimeout(clear, 700)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clear();
                  setSheetOpen(true);
                }}
              >
                <MessageSquare aria-hidden />
                Comment on paragraph
              </Button>
            </>
          ) : null}
        </SelectionToolbar>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setSweeps((n) => n + 1)}>
          Land on the second paragraph
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Image in a chapter: press to open, pinch or + to zoom</p>
          <figure className="w-40">
            <ImageLightbox
              src={demoCoverUrl(3)}
              alt=""
              openLabel="View image full screen"
              closeLabel="Close image"
              title="Image in the chapter"
              hint="Pinch, double-tap or press + and − to zoom. Drag down or press Esc to close."
            >
              <img src={demoCoverUrl(3)} alt="" className="h-auto w-full rounded-lg" />
            </ImageLightbox>
          </figure>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Comment with a spoiler</p>
          <p className="rounded-lg border p-3 text-sm">
            Did not see that coming. At the end{" "}
            <SpoilerText coverLabel="Spoiler, tap to show">the keeper was the ghost all along</SpoilerText>. Chills.
          </p>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setSheetOpen(true)}>
            Open paragraph comments
          </Button>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <DetentSheetContent
          handleLabel={(detent) => `Change sheet height, now ${detent}`}
          onDismiss={() => setSheetOpen(false)}
          bodyClassName="px-4 pb-6"
          header={
            <SheetHeader className="pt-1">
              <SheetTitle>Paragraph comments</SheetTitle>
              <SheetDescription>{QUOTE_PARAGRAPHS[1]}</SheetDescription>
            </SheetHeader>
          }
        >
          <ul className="flex flex-col gap-3">
            {Array.from({ length: 14 }, (_, index) => (
              <li key={index} className="rounded-lg border p-3 text-sm">
                Reader {index + 1}:{" "}
                {index % 3 === 0 ? "That bell gave me goosebumps." : "Can't wait for the next chapter."}
              </li>
            ))}
          </ul>
        </DetentSheetContent>
      </Sheet>
      <BackToTopButton label="Back to top" />
    </div>
  );
}

const BROWSE_TABS = ["reading", "saved", "following", "lists"] as const;
type BrowseTab = (typeof BROWSE_TABS)[number];

function BrowseShelfExample() {
  const toast = useAppToast();
  const [tab, setTab] = useState<BrowseTab>("saved");
  const [saved, setSaved] = useState([0, 1, 2]);
  const swipe = useSwipeTabs({ values: BROWSE_TABS, value: tab, onValueChange: setTab });
  const remove = (index: number) => {
    setSaved((current) => current.filter((i) => i !== index));
    toast.success("Unsaved.", {
      action: { label: "Undo", onClick: () => setSaved((current) => [...current, index].sort()) },
    });
  };
  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as BrowseTab)} className="max-w-xl">
      <TabsList variant="line" swipe={swipe.swipe} aria-label="Library">
        {BROWSE_TABS.map((value) => (
          <TabsTrigger key={value} value={value} className="capitalize">
            {value}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="overflow-x-clip">
        <div key={swipe.panelKey} {...swipe.panelProps}>
          {BROWSE_TABS.map((value) => (
            <TabsContent key={value} value={value} className="min-h-40 pt-4">
              {value === "saved" ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {saved.map((index) => (
                    <li key={index}>
                      <SwipeToRemove label="Unsave" icon={BookmarkMinus} onRemove={() => remove(index)}>
                        <div className="flex flex-col gap-2 bg-background">
                          <StoryCard
                            story={browseStory(index)}
                            labels={BROWSE_CARD_LABELS}
                            LinkComponent={AppLink}
                            locale="en"
                          />
                          <Button type="button" size="sm" variant="ghost" onClick={() => remove(index)}>
                            Unsave
                          </Button>
                        </div>
                      </SwipeToRemove>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The {value} panel. Swipe sideways on a touch screen to switch tabs.
                </p>
              )}
            </TabsContent>
          ))}
        </div>
      </div>
    </Tabs>
  );
}

// ---- Batch 2 · authoring: story form and chapter editor ------------------------------------------------------------

function AuthoringPublishExample() {
  const toast = useAppToast();
  const [title, setTitle] = useState("Chapter one");
  const [busy, setBusy] = useState(false);
  const titleOk = title.trim() !== "" && title.trim().length <= 200;
  const items = [
    { id: "title", label: "The chapter has a title of up to 200 characters", done: titleOk, hint: "Enter a title." },
    { id: "body", label: "The content only holds parts that can be saved", done: true },
    { id: "notArchived", label: "The chapter is not archived", done: true },
  ];
  const done = items.filter((item) => item.done).length;
  return (
    <div className="flex max-w-md flex-col gap-3 rounded-lg border p-4">
      <Label htmlFor="authoring-title">Chapter title (empty it)</Label>
      <Input id="authoring-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <ReadinessChecklist
        id="authoring-checklist"
        title="Before you publish"
        summary={done === items.length ? "Ready to publish" : `${done} of ${items.length} met`}
        stateLabels={{ done: "met", todo: "not met" }}
        items={items}
      />
      <SplitButton
        label="Publish"
        busyLabel="Working…"
        busy={busy}
        disabled={!titleOk}
        describedBy="authoring-checklist"
        menuLabel="More ways to publish"
        onClick={() => {
          setBusy(true);
          setTimeout(() => {
            setBusy(false);
            toast.success("Published");
          }, 1600);
        }}
        options={[
          {
            id: "schedule",
            label: "Schedule…",
            description: "Publish automatically at the time you pick",
            icon: <CalendarClock />,
            onSelect: () => toast.info("Schedule dialog"),
          },
        ]}
      />
    </div>
  );
}

function AuthoringVisibilityExample() {
  const [value, setValue] = useState<"private" | "unlisted" | "public">("private");
  return (
    <RadioCards
      aria-label="Visibility"
      className="max-w-md"
      value={value}
      onValueChange={setValue}
      options={[
        { value: "private", label: "Private", description: "Only you and collaborators can see it.", icon: Lock },
        { value: "unlisted", label: "Link only", description: "Anyone with the link, not in search.", icon: Link2 },
        { value: "public", label: "Public", description: "Everyone can see and find it.", icon: Globe },
      ]}
    />
  );
}

function AuthoringSearchPreviewExample() {
  const [title, setTitle] = useState("The Misty Forest");
  const [synopsis, setSynopsis] = useState(
    "A girl follows a lantern into the fog that never lifts from the valley, and finds a village that remembers her.",
  );
  const clean = synopsis.replace(/\s+/g, " ").trim();
  const cut = clean.length > 160 ? `${clean.slice(0, 159)}…` : clean;
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Input aria-label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <Textarea aria-label="Synopsis" rows={3} value={synopsis} onChange={(event) => setSynopsis(event.target.value)} />
      <SearchResultPreview
        siteName="StoryNest"
        url="https://storynest.app/story/42/the-misty-forest"
        title={title}
        description={cut}
        sourceLength={clean.length}
        limit={160}
        imageUrl={demoCoverUrl(1)}
        labels={{
          region: "Search and share preview",
          searchTab: "Search result",
          shareTab: "Link share",
          descriptionLength: (used, limit) => `Synopsis: ${used}/${limit} characters shown.`,
        }}
      />
    </div>
  );
}

function AuthoringUnsavedExample() {
  const [saved, setSaved] = useState("Night owl");
  const [name, setName] = useState(saved);
  const [warning, setWarning] = useState(0);
  const [saving, setSaving] = useState(false);
  const dirty = name !== saved;
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Label htmlFor="authoring-name">Display name (change it, then try the fake link)</Label>
      <Input id="authoring-name" value={name} onChange={(event) => setName(event.target.value)} />
      <Button type="button" variant="link" className="w-fit px-0" onClick={() => dirty && setWarning((n) => n + 1)}>
        Go to another page
      </Button>
      <UnsavedChangesBar
        dirty={dirty}
        message="1 unsaved change"
        warning={warning}
        warningText="Save or discard your changes before leaving"
        saveLabel="Save"
        savingLabel="Saving…"
        discardLabel="Discard"
        label="Unsaved changes"
        saving={saving}
        onSave={() => {
          setSaving(true);
          setTimeout(() => {
            setSaved(name);
            setSaving(false);
          }, 700);
        }}
        onDiscard={() => setName(saved)}
      />
    </div>
  );
}

function AuthoringSplitExample() {
  const [split, setSplit] = useState(55);
  return (
    <SplitPane
      className="max-w-3xl"
      value={split}
      defaultValue={55}
      min={35}
      max={70}
      onValueChange={setSplit}
      separatorLabel="Editor width, adjust with the arrow keys"
      start={
        <div className="min-h-48 rounded-lg border bg-card p-4 text-sm">
          <p className="font-medium">Editor ({split}%)</p>
          <p className="text-muted-foreground">Drag the handle, or focus it and use ←/→, Home/End, Esc.</p>
        </div>
      }
      end={
        <div className="reader-text min-h-48 rounded-lg border bg-background p-4">
          <h3 className="text-xl font-semibold">Chapter one</h3>
          <p>As the sun sets, the alleys change hue.</p>
        </div>
      }
    />
  );
}

function AuthoringToolbarExample() {
  const tools = [
    { id: "bold", label: "Bold", icon: Bold, shortcut: ["Mod", "B"] },
    { id: "italic", label: "Italic", icon: Italic, shortcut: ["Mod", "I"] },
    { id: "find", label: "Find and replace", icon: TextSearch, shortcut: ["Mod", "F"] },
    { id: "divider", label: "Divider", icon: Minus },
  ];
  return (
    <ToolbarTooltips>
      <div role="toolbar" aria-label="Formatting" className="flex w-fit gap-1 rounded-lg border bg-card p-1">
        {tools.map(({ id, label, icon: Icon, shortcut }) => (
          <ShortcutTooltip key={id} label={label} shortcut={shortcut}>
            <Button type="button" size="icon" variant="ghost" aria-label={label} data-tool={id}>
              <Icon aria-hidden className="size-4" />
            </Button>
          </ShortcutTooltip>
        ))}
      </div>
    </ToolbarTooltips>
  );
}

function AuthoringTourExample() {
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const find = (selector: string) => () => area.current?.querySelector(selector) ?? null;
  return (
    <div ref={area} className="flex max-w-md flex-col gap-3 rounded-lg border p-4">
      <div data-demo="toolbar" className="flex gap-1 rounded-md border bg-card p-1">
        <Button type="button" size="icon" variant="ghost" aria-label="Bold">
          <Bold aria-hidden className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Find" data-demo="find">
          <TextSearch aria-hidden className="size-4" />
        </Button>
      </div>
      <p data-demo="autosave" className="text-sm text-muted-foreground">
        120 words · Saved
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={() => setOpen(true)}>
          Take the tour
        </Button>
        {ended ? <span className="text-sm text-muted-foreground">Ended: {ended}</span> : null}
      </div>
      {open ? (
        <SpotlightTour
          steps={[
            {
              id: "toolbar",
              target: find('[data-demo="toolbar"]'),
              title: "Formatting toolbar",
              body: "Bold, italic…",
            },
            { id: "autosave", target: find('[data-demo="autosave"]'), title: "Autosave", body: "Saved as you type." },
            { id: "find", target: find('[data-demo="find"]'), title: "Find and replace", body: "Ctrl+F." },
          ]}
          labels={{
            dialog: "Chapter editor tour",
            next: "Next",
            back: "Back",
            done: "Done",
            skip: "Skip",
            progress: (step, total) => `Step ${step} of ${total}`,
          }}
          onEnd={(how) => {
            setEnded(how);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AuthoringResponsiveExample() {
  return (
    <ResponsivePreview
      presets={[
        { id: "phone", label: "Phone", width: 375, icon: Smartphone },
        { id: "tablet", label: "Tablet", width: 768, icon: Tablet },
        { id: "desktop", label: "Desktop", width: null, icon: Monitor },
      ]}
      labels={{ presets: "Preview screen size", handle: "Preview width", width: (px) => `${px} px` }}
      defaultPreset="phone"
    >
      <article className="reader-text mx-auto flex max-w-[var(--reader-measure)] flex-col gap-4 px-4 py-6">
        <h3 className="text-2xl font-semibold @min-[40rem]:text-3xl">Chapter one</h3>
        <p>
          As the sun sets, the alleys change hue. The lantern-maker closes his shutters one by one, and the fog comes
          down from the hills to listen.
        </p>
      </article>
    </ResponsivePreview>
  );
}

const batch3StatsChapters = [
  { n: 1, reads: 412, likes: 21, retention: null },
  { n: 2, reads: 318, likes: 12, retention: 0.77 },
  { n: 3, reads: 290, likes: 25, retention: 0.91 },
  { n: 4, reads: 201, likes: 6, retention: 0.69 },
  { n: 5, reads: 188, likes: 15, retention: 0.94 },
  { n: 6, reads: 33, likes: 4, retention: 0.18 },
  { n: 7, reads: 12, likes: 3, retention: 0.36 },
];

function Batch3StatsScatterExample() {
  const [metric, setMetric] = useState<"likes" | "retention">("likes");
  const [fade, setFade] = useState(false);
  const metricName = metric === "likes" ? "Likes per 100 reads" : "Retention";
  const plotted = batch3StatsChapters.flatMap((c) => {
    const value = metric === "likes" ? (c.likes / c.reads) * 100 : c.retention;
    return value === null ? [] : [{ ...c, value }];
  });
  const format = (v: number) => (metric === "likes" ? v.toFixed(1) : `${Math.round(v * 100)}%`);
  return (
    <div id="batch3-stats-scatter" className="max-w-xl">
      <ScatterPicker
        toolbar={
          <div role="group" aria-label="Vertical axis" className="flex flex-wrap gap-1">
            {(["likes", "retention"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={option === metric}
                onClick={() => setMetric(option)}
                className="aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
              >
                {option === "likes" ? "Likes per 100 reads" : "Retention"}
              </Button>
            ))}
          </div>
        }
        label={`Chapters by reads (across) and ${metricName} (up)`}
        hint="Use the arrow keys to move between chapters, Enter to pick one, Esc to let go."
        xLabel="Reads →"
        yLabel={`↑ ${metricName}`}
        formatX={(v) => String(v)}
        formatY={format}
        summary={`${plotted.length} chapters plotted. Press a dot to see its figures.`}
        filter={{ label: "Fade chapters under 42 reads", pressed: fade, onPressedChange: setFade, below: 42 }}
        points={plotted.map((c) => {
          const detail = `Chapter ${c.n}: ${c.reads} reads, ${c.likes} likes, ${metricName} ${format(c.value)}.`;
          return { key: String(c.n), x: c.reads, y: c.value, label: detail, detail };
        })}
      />
    </div>
  );
}

function Browse3TitleExample() {
  const [title, setTitle] = useState("Rainy-day reads");
  return (
    <div id="browse3-title" className="flex flex-col gap-1">
      <InlineEditTitle
        value={title}
        onSave={async (next) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (next.toLowerCase() === "fail") throw new Error("Couldn't save. Try again.");
          setTitle(next);
        }}
        validate={(next) => (next === "" ? "Enter a list name." : next.length > 40 ? "Up to 40 characters." : null)}
        editLabel={`Rename list: ${title}`}
        inputLabel="List name"
        saveLabel="Save name"
        cancelLabel="Cancel"
      />
      <p className="text-xs text-muted-foreground">Press the title. Enter saves, Esc cancels, "fail" fails.</p>
    </div>
  );
}

function Browse3PadlockExample() {
  const [open, setOpen] = useState(false);
  return (
    <Button id="browse3-padlock" variant="outline" className="w-fit" onClick={() => setOpen((v) => !v)}>
      <PadlockIcon open={open} className="size-4" />
      {open ? "Public" : "Private"}
    </Button>
  );
}

function Browse3CoverStackExample() {
  const lists = [
    { name: "Rainy-day reads", covers: [null, null, null] },
    { name: "Short and sweet", covers: [null] },
    { name: "Empty for now", covers: [] },
  ];
  return (
    <ul id="browse3-stack" className="flex flex-col gap-2">
      {lists.map((list) => (
        <li key={list.name}>
          <a
            href="#browse3-stack"
            className="group flex items-center gap-3 rounded-xl border bg-card p-3 text-card-foreground hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <CoverStack covers={list.covers.map((url) => ({ url }))} />
            <span className="text-sm font-semibold">{list.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Browse3RevealExample() {
  const [count, setCount] = useState(4);
  const items = Array.from({ length: count }, (_, i) => ({ id: `story-${i + 1}` }));
  return (
    <div id="browse3-reveal">
      <InfiniteList
        items={items}
        getKey={(item) => item.id}
        listClassName="grid grid-cols-2 gap-3 sm:grid-cols-4"
        renderItem={(item) => (
          <div className="flex h-20 items-center justify-center rounded-xl border bg-card text-sm">{item.id}</div>
        )}
        hasMore={count < 16}
        isLoadingMore={false}
        onLoadMore={() => setCount((n) => Math.min(n + 4, 16))}
        loadMoreLabel="Load more"
        revealAppended
      />
    </div>
  );
}

// Batch 3 · studio3: inline alerts (072), submit button states (001), breadcrumbs with a story switcher (103, 037).
function Studio3AlertsExample() {
  const [shown, setShown] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <div className="flex max-w-md flex-col gap-3" id="studio3-alerts">
      <h3 ref={heading} tabIndex={-1} className="text-sm font-semibold outline-none">
        Publish
      </h3>
      <InlineAlert
        title="Unsaved text from this device"
        actions={
          <>
            <Button size="sm">Restore</Button>
            <Button size="sm" variant="ghost">
              Discard
            </Button>
          </>
        }
      >
        Kept 3 minutes ago, after the connection dropped.
      </InlineAlert>
      <InlineAlert tone="danger" title="The draft was changed elsewhere">
        Reload to get the new draft; unsaved changes here will be lost.
      </InlineAlert>
      {shown ? (
        <InlineAlert
          tone="danger"
          onDismiss={() => setShown(false)}
          dismissLabel="Dismiss the error"
          focusAfterDismiss={heading}
        >
          The draft or the chapter state changed elsewhere. Reload and try again.
        </InlineAlert>
      ) : (
        <Button size="sm" variant="outline" className="w-fit" onClick={() => setShown(true)}>
          Show the error again
        </Button>
      )}
    </div>
  );
}

function Studio3SubmitExample() {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(0);
  return (
    <form
      id="studio3-submit"
      className="flex items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          setSaved((count) => count + 1);
        }, 1200);
      }}
    >
      <SubmitButton label="Save changes" busyLabel="Saving…" doneLabel="Saved" busy={busy} succeeded={saved} />
    </form>
  );
}

function Studio3CrumbsExample() {
  const toast = useAppToast();
  const [story, setStory] = useState("a");
  const stories = [
    { id: "a", label: "The lantern keeper of the northern ferry crossing", description: "Owner" },
    { id: "b", label: "Salt and paper", description: "Co-author" },
    { id: "c", label: "Night market", description: "Editor" },
  ];
  const current = stories.find((item) => item.id === story)!;
  return (
    <div id="studio3-crumbs" className="max-w-xl">
      <Breadcrumbs
        label="Location in Studio"
        LinkComponent={AppLink}
        items={[
          { label: "Studio", href: "/dev/gallery" },
          {
            label: current.label,
            href: "/dev/gallery",
            switcher: {
              label: "Switch to another story",
              value: story,
              options: stories,
              onSelect: (id) => {
                setStory(id);
                toast.info(`Would open /studio/story/${id}/chapters`);
              },
            },
          },
          { label: "Chapters" },
        ]}
      />
    </div>
  );
}

function Reader3ToolbarExample() {
  const [playing, setPlaying] = useState(false);
  const [read, setRead] = useState(0);
  return (
    <div className="flex items-center gap-3" data-slot="reader3-toolbar-demo">
      <PlayPauseButton
        playing={playing}
        progress={read / 8}
        onToggle={() => {
          setPlaying((p) => !p);
          if (!playing) setRead((n) => (n >= 8 ? 1 : n + 1));
        }}
        playLabel="Read this chapter aloud"
        pauseLabel="Pause reading aloud"
      />
      <span className="text-sm text-muted-foreground">
        {playing ? "Reading aloud" : "Paused"} · paragraph {read} of 8
      </span>
    </div>
  );
}

const READER3_SIZES = ["Small", "Medium", "Large", "Extra large"];
const READER3_THEMES = [
  {
    value: "site",
    label: "Match app theme",
    className: "bg-[linear-gradient(135deg,var(--color-paper-light)_50%,var(--color-paper-dark)_50%)]",
  },
  { value: "light", label: "Light", className: "bg-paper-light text-ink-light", content: "Aa" },
  { value: "sepia", label: "Sepia", className: "bg-paper-sepia text-ink-sepia", content: "Aa" },
  { value: "dark", label: "Dark", className: "bg-paper-dark text-ink-dark", content: "Aa" },
] as const;
type Reader3Theme = (typeof READER3_THEMES)[number]["value"];

function Reader3SettingsExample() {
  const [size, setSize] = useState(1);
  const [theme, setTheme] = useState<Reader3Theme>("site");
  return (
    <div className="flex max-w-sm flex-col gap-6 rounded-xl border p-4" data-slot="reader3-settings-demo">
      <RollingStepper
        label="Font size"
        valueText={READER3_SIZES[size] ?? ""}
        position={size}
        canDecrease={size > 0}
        canIncrease={size < READER3_SIZES.length - 1}
        onStep={(d) => setSize((n) => n + d)}
        decreaseLabel="Decrease font size"
        increaseLabel="Increase font size"
      />
      <SwatchPicker<Reader3Theme>
        label="Background"
        options={READER3_THEMES}
        value={theme}
        onChange={(next, swatch) =>
          revealFrom(swatch, () => {
            setTheme(next);
            // Re-skins the whole gallery like the reader does; "Match app theme" puts it back.
            if (next === "site") delete document.documentElement.dataset.readerTheme;
            else document.documentElement.dataset.readerTheme = next;
          })
        }
      />
    </div>
  );
}

function Reader3ContentsExample() {
  const chapters = Array.from({ length: 240 }, (_, i) => i + 1);
  const marks = chapters.filter((n) => n % 50 === 1);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  return (
    <div className="flex flex-col gap-4 sm:flex-row" data-slot="reader3-contents-demo">
      <SectionOutline
        title="In this chapter"
        items={[
          { id: "a", label: "The fog comes down" },
          { id: "b", label: "A map in the drawer" },
          { id: "c", label: "Lanterns" },
        ]}
        currentId="b"
        onSelect={() => undefined}
        className="sm:w-56"
      />
      <div className="relative h-72 min-w-0 rounded-xl border sm:flex-1">
        <ol ref={list} className="h-full overflow-y-auto py-2 pr-12 pl-4 text-sm">
          {chapters.map((n) => (
            <li key={n} data-index={n - 1} className="py-1.5">
              Chapter {n}
            </li>
          ))}
        </ol>
        <ScrubIndex
          label="Jump to chapter"
          marks={marks.map(String)}
          active={active}
          onSelect={(i) => {
            setActive(i);
            const row = list.current?.querySelector<HTMLElement>(`[data-index="${(marks[i] ?? 1) - 1}"]`);
            if (row && list.current) scrollRowToTop(list.current, row);
          }}
          markLabel={(m) => `From chapter ${m}`}
          className="absolute inset-y-2 right-2"
        />
      </div>
    </div>
  );
}

function Reader3FinishExample() {
  const [play, setPlay] = useState(0);
  return (
    <div className="flex max-w-md flex-col gap-3" data-slot="reader3-finish-demo">
      <FinishCelebration
        title="You finished the story!"
        description="The Misty Forest is complete. Thanks for reading all the way to the last chapter."
        play={play}
      >
        <Button variant="outline">Add to list</Button>
      </FinishCelebration>
      <Button variant="ghost" className="w-fit" onClick={() => setPlay((n) => n + 1)}>
        Celebrate again
      </Button>
    </div>
  );
}

function Reader3RangesExample() {
  const [open, setOpen] = useState<string | null>("0");
  const ranges = [0, 50, 100, 150].map((start) => ({
    start,
    count: start === 150 ? 37 : 50,
  }));
  return (
    <AccordionList
      className="max-w-xl"
      openId={open}
      onOpenChange={setOpen}
      items={ranges.map(({ start, count }) => ({
        id: String(start),
        title: `Chapters ${start + 1}–${start + count}`,
        meta: `${count} chapters`,
        content: (
          <ol className="divide-y border-t text-sm">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="px-4 py-2.5">
                Chapter {start + i + 1}
              </li>
            ))}
          </ol>
        ),
      }))}
    />
  );
}

function Shell3LockoutExample() {
  const total = 15;
  const cooldown = useCountdown(total);
  const [started, setStarted] = useState(false);
  return (
    <div id="shell3-lockout" className="flex max-w-sm flex-col gap-3">
      {started ? (
        <LockoutCountdown
          secondsLeft={cooldown.left}
          total={total}
          title="Too many attempts"
          readyTitle="You can try again now"
          waitingLabel={(clock) => `Try again in ${clock}`}
          action={
            cooldown.left > 0 ? (
              <a href="#shell3-lockout" className="text-primary underline-offset-4 hover:underline">
                Reset your password instead
              </a>
            ) : undefined
          }
        />
      ) : null}
      <Button
        type="button"
        disabled={cooldown.left > 0}
        onClick={() => {
          setStarted(true);
          cooldown.restart();
        }}
      >
        Sign in
      </Button>
    </div>
  );
}

const shell3TakenNames = ["reader", "admin", "storynest"];

function Shell3AvailabilityExample() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<AvailabilityStatus>("idle");
  const timer = useRef<number | undefined>(undefined);
  return (
    <div id="shell3-availability" className="flex max-w-sm flex-col gap-2">
      <Label htmlFor="shell3-username">Username (try “reader”)</Label>
      <Input
        id="shell3-username"
        value={value}
        autoCapitalize="none"
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          window.clearTimeout(timer.current);
          if (!/^[A-Za-z0-9_]{3,30}$/.test(next)) return setStatus("idle");
          setStatus("checking");
          timer.current = window.setTimeout(
            () => setStatus(shell3TakenNames.includes(next.toLowerCase()) ? "taken" : "available"),
            700,
          );
        }}
      />
      <AvailabilityHint
        status={status}
        labels={{
          checking: "Checking the name…",
          available: "This name looks free",
          taken: "This name is already taken",
        }}
      />
    </div>
  );
}

function Shell3RetryExample() {
  const [attempts, setAttempts] = useState(0);
  const [loaded, setLoaded] = useState(false);
  if (loaded) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm">Loaded after {attempts} retries.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLoaded(false);
            setAttempts(0);
          }}
        >
          Reset
        </Button>
      </div>
    );
  }
  return (
    <div id="shell3-retry" className="rounded-xl border">
      <ErrorState
        title="Couldn't load this list"
        description="The first retry fails, the second works."
        retryLabel="Retry"
        onRetry={() =>
          new Promise<void>((resolve) =>
            window.setTimeout(() => {
              setAttempts((count) => count + 1);
              if (attempts >= 1) setLoaded(true);
              resolve();
            }, 900),
          )
        }
      />
    </div>
  );
}

function Shell3IntroExample() {
  const [open, setOpen] = useState(false);
  return (
    <div id="shell3-intro">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Show the first-run intro
      </Button>
      {open ? (
        <WaveIntro
          open
          onOpenChange={setOpen}
          pages={[
            {
              icon: BookOpen,
              title: "Read your way",
              body: "Open a story and read it chapter by chapter. Where you stopped is remembered for next time.",
            },
            {
              icon: Library,
              title: "Follow and save to your Library",
              body: "Follow the stories and authors you like, and save stories to your Library to find them again.",
            },
            {
              icon: PenLine,
              title: "Write in Studio",
              body: "Start a new story, write it chapter by chapter and publish when you are ready.",
            },
          ]}
          labels={{ next: "Next", done: "Get started", skip: "Skip", step: (n, total) => `Page ${n} of ${total}` }}
        />
      ) : null}
    </div>
  );
}

const shell3Commands = [
  { key: "/", label: "Home", icon: Home },
  { key: "/library", label: "Library", icon: Library },
  { key: "/studio", label: "Studio", icon: PenLine },
  { key: "/settings", label: "Settings", icon: Settings },
];
const shell3Stories = ["The Lantern Keeper", "Library of Ashes", "Studio Nights"];

function Shell3PaletteExample() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  return (
    <div id="shell3-palette" className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        Open the command palette (Ctrl/⌘ K in the app)
      </Button>
      {picked ? <span className="text-sm text-muted-foreground">Picked: {picked}</span> : null}
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        query={query}
        onQueryChange={setQuery}
        groups={[
          {
            key: "go",
            label: "Go to",
            items: shell3Commands
              .filter((c) => c.label.toLowerCase().includes(needle))
              .map((c) => ({ ...c, onSelect: () => setPicked(c.key) })),
          },
          {
            key: "stories",
            label: "Stories",
            items:
              needle.length >= 2
                ? shell3Stories
                    .filter((title) => title.toLowerCase().includes(needle))
                    .map((title) => ({ key: title, label: title, icon: BookOpen, onSelect: () => setPicked(title) }))
                : [],
          },
        ]}
        labels={{
          title: "Command palette",
          input: "Find a page or a story",
          placeholder: "Go to a page or find a story…",
          empty: "Nothing matches",
          results: "Results",
        }}
        footer={
          <>
            <span>↑↓ select</span>
            <span>Enter open</span>
            <span>Esc close</span>
          </>
        }
      />
    </div>
  );
}

type Community3Kind = "all" | "chapters" | "replies" | "team";
type Community3Row = { id: string; kind: Exclude<Community3Kind, "all">; text: string; read: boolean };

function Community3NotificationsExample() {
  const [rows, setRows] = useState<Community3Row[]>([
    { id: "n3", kind: "chapters", text: "“Salt and paper” just published chapter 12", read: false },
    { id: "n2", kind: "replies", text: "Mai replied to your comment: “Same here!”", read: true },
    { id: "n1", kind: "team", text: "Lan invited you to co-author “Night market”", read: false },
  ]);
  const [kind, setKind] = useState<Community3Kind>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const arrivals = useArrivals(rows, (row) => row.id);
  const scoped = rows.filter((row) => !unreadOnly || !row.read);
  const shown = scoped.filter((row) => kind === "all" || row.kind === kind);
  const count = (value: Community3Kind) => scoped.filter((row) => value === "all" || row.kind === value).length;
  const labels: Record<Community3Kind, string> = {
    all: "All",
    chapters: "New chapters",
    replies: "Replies",
    team: "Team",
  };
  return (
    <div id="community3-notifications" className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ChoicePills
          aria-label="Filter by type"
          value={kind}
          onValueChange={setKind}
          options={(Object.keys(labels) as Community3Kind[]).map((value) => ({
            value,
            label: labels[value],
            count: count(value),
          }))}
        />
        <Button
          size="sm"
          variant="outline"
          aria-pressed={unreadOnly}
          className="aria-pressed:border-primary aria-pressed:bg-primary/10"
          onClick={() => setUnreadOnly((on) => !on)}
        >
          Unread only
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setRows((current) => [
              {
                id: `n${current.length + 1}`,
                kind: "replies",
                text: `Reader ${current.length + 1} replied to your comment`,
                read: false,
              },
              ...current,
            ])
          }
        >
          Simulate a new one
        </Button>
      </div>
      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {kind !== "all" || unreadOnly ? `Showing ${shown.length} of ${rows.length} loaded notifications` : ""}
      </p>
      <ul className="flex flex-col gap-2">
        {shown.map((row) => (
          <li
            key={row.id}
            className={cn(
              "rounded-xl border bg-card p-3 text-sm",
              !row.read && "font-medium",
              arrivals.has(row.id) && "animate-row-arrive",
            )}
          >
            {row.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

const COMMUNITY3_REASONS = {
  spam: { label: "Spam or advertising", hint: "Say what is being advertised or repeated, if it isn't obvious." },
  harassment: { label: "Harassment or abuse", hint: "Say who is targeted and how. Quoting the words helps." },
  copyright: { label: "Copyright infringement", hint: "Name the original work and where it was first published." },
  other: { label: "Other reason", hint: "Tell us what is wrong. The more specific, the faster a moderator can act." },
} as const;
type Community3Reason = keyof typeof COMMUNITY3_REASONS;

function Community3ReportExample() {
  const [reason, setReason] = useState<Community3Reason | "">("");
  const [details, setDetails] = useState("");
  const max = 200;
  return (
    <div id="community3-report" className="flex max-w-md flex-col gap-3">
      <p id="community3-reason" className="text-sm font-medium">
        Reason
      </p>
      <ChoicePills
        aria-labelledby="community3-reason"
        value={reason}
        onValueChange={setReason}
        options={(Object.keys(COMMUNITY3_REASONS) as Community3Reason[]).map((value) => ({
          value,
          label: COMMUNITY3_REASONS[value].label,
        }))}
      />
      <div className="relative">
        <Textarea
          aria-label="Details (optional)"
          aria-describedby="community3-count"
          maxLength={max}
          value={details}
          className="pr-10"
          onChange={(event) => setDetails(event.target.value)}
        />
        <CharacterRing
          id="community3-count"
          length={details.length}
          max={max}
          label={`${details.length} of ${max} characters`}
          className="pointer-events-none absolute right-2.5 bottom-2.5"
        />
      </div>
      {reason === "" ? null : (
        <p key={reason} className="animate-hint-swap text-xs text-muted-foreground">
          {COMMUNITY3_REASONS[reason].hint}
        </p>
      )}
    </div>
  );
}

function Community3UploadExample() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  return (
    <div id="community3-upload" className="flex flex-col gap-3">
      <div className="flex items-end gap-4">
        <UploadVeil busy={busy} done={done} className="w-24 rounded-lg">
          <StoryCover title="Salt and paper" coverUrl={null} />
        </UploadVeil>
        <UploadVeil busy={busy} done={done} className="rounded-full">
          <span className="grid size-20 place-items-center rounded-full bg-secondary text-2xl font-semibold">M</span>
        </UploadVeil>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setTimeout(() => {
              setBusy(false);
              setDone((count) => count + 1);
            }, 1500);
          }}
        >
          {busy ? "Uploading…" : "Change cover"}
        </Button>
      </div>
      {done > 0 && !busy ? (
        <SizeShrink
          original={3_240_000}
          result={86_000}
          formatSize={(bytes) =>
            bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} kB`
          }
          labels={{
            original: "Original",
            result: "Uploaded",
            saved: (percent) => `${percent}% smaller`,
            summary: (original, result, percent) => `Original ${original}, uploaded ${result}, ${percent}% smaller`,
          }}
        />
      ) : null}
    </div>
  );
}

function Community3SwipeExample() {
  const [replying, setReplying] = useState(false);
  return (
    <div id="community3-swipe" className="flex max-w-md flex-col gap-2">
      <SwipeToReply onReply={() => setReplying(true)}>
        <article className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm">
          <span className="font-medium">Mai</span>
          <p>That last chapter broke my heart. (Swipe me right on a touch screen.)</p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-fit px-2 text-xs"
            aria-expanded={replying}
            onClick={() => setReplying((open) => !open)}
          >
            Reply
          </Button>
        </article>
      </SwipeToReply>
      {replying ? <Textarea aria-label="Write a reply" autoFocus placeholder="Write a reply…" /> : null}
    </div>
  );
}

const habits4Day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

function habits4Start(): { stats: StatsRow; days: DayRow[]; earned: { code: string; earned_at: string }[] } {
  const days = [-6, -5, -4, -3, -2, -1].map((offset) => ({
    read_day: habits4Day(offset),
    chapters_read: 1 + ((offset + 7) % 3),
    chapters_finished: (offset + 7) % 2,
  }));
  return {
    stats: {
      current_streak: 6,
      longest_streak: 6,
      last_read_day: habits4Day(-1),
      reading_days: 6,
      chapters_read: 14,
      chapters_finished: 9,
      stories_finished: 0,
    },
    days,
    earned: [{ code: "first_chapter", earned_at: new Date(Date.now() - 6 * 86_400_000).toISOString() }],
  };
}

/** Reading habits with local data: the buttons stand in for reading (in the app the server records it). */
function Habits4Example() {
  const [state, setState] = useState(habits4Start);
  const goal = 3;
  const today = habits4Day(0);
  const earn = (earned: { code: string; earned_at: string }[], code: string, when: boolean) =>
    when && !earned.some((e) => e.code === code) ? [...earned, { code, earned_at: new Date().toISOString() }] : earned;
  const act = (kind: "read" | "finish" | "story") =>
    setState((s) => {
      const row = s.days.find((d) => d.read_day === today) ?? {
        read_day: today,
        chapters_read: 0,
        chapters_finished: 0,
      };
      const firstToday = kind === "read" && row.chapters_read === 0;
      const nextRow = {
        ...row,
        chapters_read: row.chapters_read + (kind === "read" ? 1 : 0),
        chapters_finished: row.chapters_finished + (kind === "finish" ? 1 : 0),
      };
      const streak = s.stats.current_streak + (firstToday ? 1 : 0);
      const stats: StatsRow = {
        ...s.stats,
        current_streak: streak,
        longest_streak: Math.max(s.stats.longest_streak, streak),
        last_read_day: firstToday ? today : s.stats.last_read_day,
        reading_days: s.stats.reading_days + (firstToday ? 1 : 0),
        chapters_read: s.stats.chapters_read + (kind === "read" ? 1 : 0),
        chapters_finished: s.stats.chapters_finished + (kind === "finish" ? 1 : 0),
        stories_finished: s.stats.stories_finished + (kind === "story" ? 1 : 0),
      };
      let earned = earn(s.earned, "daily_goal", nextRow.chapters_read >= goal);
      earned = earn(earned, "streak_7", stats.longest_streak >= 7);
      earned = earn(earned, "first_story", stats.stories_finished >= 1);
      return { stats, days: [...s.days.filter((d) => d.read_day !== today), nextRow], earned };
    });
  const habits = toReadingHabits(
    { stats: state.stats, days: state.days, achievements: state.earned, goal },
    new Date(),
  );
  return (
    <div id="habits4" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => act("read")}>
          Read a chapter
        </Button>
        <Button variant="outline" size="sm" onClick={() => act("finish")}>
          Finish a chapter
        </Button>
        <Button variant="outline" size="sm" onClick={() => act("story")}>
          Finish a story
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setState(habits4Start())}>
          Reset
        </Button>
      </div>
      <ReadingHabitsView habits={habits} locale="vi" name="Demo An" settingsHref="/settings" />
    </div>
  );
}

function Platform4BannerExample() {
  const [closed, setClosed] = useState(false);
  return (
    <div id="platform4-banner" className="flex max-w-xl flex-col overflow-hidden rounded-lg border">
      <RollingBanner
        items={[
          { id: "a", title: "Autumn writing contest", body: "Entries open until 30 November", href: "/ranking" },
          { id: "b", title: "New: reading lists", body: "Collect stories and share them" },
          { id: "c", title: "Maintenance on Sunday", body: "02:00 to 03:00, reading stays available" },
        ]}
        labels={{
          region: "Announcements",
          roleDescription: "rotating banner",
          tag: "New",
          next: "Next announcement",
          close: "Close announcements",
          reopen: "Show announcements again",
        }}
        closed={closed}
        reopenable
        onClose={() => setClosed(true)}
        onReopen={() => setClosed(false)}
        renderLink={(_item, children, className) => (
          <a href="#platform4-banner" className={className}>
            {children}
          </a>
        )}
      />
      <p className="p-3 text-sm text-muted-foreground">The page moves up when the strip folds away.</p>
    </div>
  );
}

function Platform4PopupExample() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  return (
    <div id="platform4-popup" className="flex flex-col gap-2">
      <Button
        className="w-fit"
        onClick={() => {
          setSeen(true);
          setOpen(true);
        }}
      >
        Open the event popup
      </Button>
      <EventPopup
        slides={[
          {
            id: "a",
            eyebrow: "Until 30 Nov",
            title: "Autumn writing contest",
            body: "Win a cover by our illustrators.",
            href: "/ranking",
          },
          { id: "b", eyebrow: "Until 15 Dec", title: "Reading marathon", body: "Read 10 chapters, earn a badge." },
          { id: "c", eyebrow: "Until 1 Jan", title: "New ranking", body: "Weekly top stories by category." },
        ]}
        open={open}
        giftVisible={seen}
        onHide={() => setOpen(false)}
        onReopen={() => setOpen(true)}
        labels={{
          dialog: "Events",
          dontShowToday: "Don't show today",
          close: "Close",
          reopen: "Show events again",
          seeYouTomorrow: "See you tomorrow",
          position: (index, count) => `${index} / ${count}`,
          open: "View details",
        }}
        renderLink={(_slide, children, className) => (
          <a href="#platform4-popup" className={className}>
            {children}
          </a>
        )}
      />
    </div>
  );
}

function Platform4SettingsExample() {
  const [values, setValues] = useState({ chapters: true, replies: false, answers: true });
  const [types, setTypes] = useState({ accepted: true, declined: false });
  const channels = <p className="text-xs text-muted-foreground">In the app: on · Email and push: not available yet.</p>;
  return (
    <div id="platform4-settings" className="max-w-md rounded-xl border p-4">
      <ExpandingSettings
        summary={(on) => (on === 0 ? "All off" : `${on} of 3 on`)}
        turnAllOff={{
          label: "Turn all off",
          onTurnAllOff: () => setValues({ chapters: false, replies: false, answers: false }),
        }}
        items={[
          {
            id: "chapters",
            icon: <BookOpen />,
            label: "New chapters",
            description: "A story you follow has a new chapter.",
            checked: values.chapters,
            onCheckedChange: (on) => setValues((v) => ({ ...v, chapters: on })),
            details: channels,
          },
          {
            id: "replies",
            icon: <MessageCircle />,
            label: "Replies to comments",
            description: "Someone replies to your comment.",
            checked: values.replies,
            onCheckedChange: (on) => setValues((v) => ({ ...v, replies: on })),
            details: channels,
          },
          {
            id: "answers",
            icon: <Users />,
            label: "Answers to invitations",
            description: "Someone you invited accepts or declines.",
            checked: values.answers,
            onCheckedChange: (on) => setValues((v) => ({ ...v, answers: on })),
            details: (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="platform4-accepted">Accepted</Label>
                  <Switch
                    id="platform4-accepted"
                    checked={types.accepted}
                    onCheckedChange={(on) => setTypes((v) => ({ ...v, accepted: on }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="platform4-declined">Declined</Label>
                  <Switch
                    id="platform4-declined"
                    checked={types.declined}
                    onCheckedChange={(on) => setTypes((v) => ({ ...v, declined: on }))}
                  />
                </div>
                {channels}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function Platform4MatrixExample() {
  const rights: [string, boolean, boolean, boolean][] = [
    ["See the story and unpublished chapters", true, true, true],
    ["Edit the story details", true, true, false],
    ["Write and edit drafts", true, true, true],
    ["Publish and schedule", true, true, true],
    ["Unpublish chapters", true, true, false],
    ["Invite and remove collaborators", true, false, false],
  ];
  return (
    <div id="platform4-matrix" className="max-w-md rounded-xl border bg-card p-3">
      <RoleMatrix
        caption="Rights of the owner, co-authors and editors"
        labels={{ right: "Right", allowed: "Allowed", notAllowed: "Not allowed" }}
        columns={[
          { key: "owner", label: "Owner" },
          { key: "co_author", label: "Co-author" },
          { key: "editor", label: "Editor" },
        ]}
        rows={rights.map(([label, owner, coAuthor, editor]) => ({
          key: label,
          label,
          allowed: { owner, co_author: coAuthor, editor },
        }))}
      />
    </div>
  );
}

// Batch 4 · insights4 (Lucian 030, 161, 326, 399, 246, 359, 322, 024, 153). Sample data only.
function Insights4RangeExample() {
  const [applied, setApplied] = useState<DateRange | null>({ from: "2026-10-20", to: "2026-11-02" });
  return (
    <div id="insights4-range" className="flex flex-col gap-2">
      <DateRangeCalendar
        value={applied}
        min="2026-08-08"
        max="2026-11-05"
        maxSpanDays={90}
        locale="en"
        onApply={setApplied}
        text={{
          fromLabel: "From",
          toLabel: "To",
          placeholder: "Pick a day",
          previousMonth: "Previous month",
          nextMonth: "Next month",
          gridLabel: "Days of the month",
          apply: "Apply",
          pickStart: "Pick the first day",
          pickEnd: "Now pick the last day",
          summary: (days, from, to) => `${days} days · ${from} – ${to}`,
        }}
      />
      <p className="text-sm text-muted-foreground">Applied: {applied ? `${applied.from} – ${applied.to}` : "none"}</p>
    </div>
  );
}

const insights4Cohorts: CohortRow[] = [
  { key: "w1", label: "9/14", sizeText: "42 readers", cells: [1, 0.62, 0.48, 0.4, 0.36] },
  { key: "w2", label: "9/21", sizeText: "35 readers", cells: [1, 0.57, 0.46, 0.37] },
  { key: "w3", label: "9/28", sizeText: "Fewer than 5", cells: [null, null, null], suppressed: true },
  { key: "w4", label: "10/5", sizeText: "28 readers", cells: [1, 0.71] },
  { key: "w5", label: "10/12", sizeText: "19 readers", cells: [1] },
];

function Insights4CohortExample() {
  return (
    <div id="insights4-cohorts">
      <CohortGrid
        rows={insights4Cohorts}
        weeks={5}
        text={{
          label: "Share of readers still reading, by starting week",
          week: (n) => (n === 0 ? "Start" : `+${n}`),
          idle: "Pick a cell to see its share.",
          cell: (row, offset, percent) => `Started ${row.label} (${row.sizeText}) · week ${offset}: ${percent}`,
          hidden: (row) => `Week of ${row.label}: fewer than 5 readers, hidden`,
        }}
      />
    </div>
  );
}

const insights4Windows = { 7: [38, 62], 30: [55, 45], 90: [61, 39] } as const;

function Insights4WaffleExample() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [signedIn, guests] = insights4Windows[days];
  return (
    <div id="insights4-waffle" className="flex flex-col gap-3">
      <div className="flex gap-1">
        {([7, 30, 90] as const).map((d) => (
          <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => setDays(d)}>
            {d} days
          </Button>
        ))}
      </div>
      <WaffleChart
        segments={[
          { key: "in", label: "Signed in", value: signedIn, tone: 1 },
          { key: "guest", label: "Guests", value: guests, tone: 2 },
        ]}
        text={{
          label: `Reads of the last ${days} days by reader type`,
          legend: "Reader type",
          share: (segment, percent) => `${segment.label}: ${percent}%`,
          empty: "No reads yet",
        }}
      />
    </div>
  );
}

const insights4Months: CloudPeriod[] = [
  {
    key: "09",
    label: "Sep",
    words: [
      { term: "plot", count: 9 },
      { term: "slow", count: 4 },
      { term: "hay", count: 7 },
      { term: "villain", count: 3 },
      { term: "cliffhanger", count: 2 },
    ],
  },
  {
    key: "10",
    label: "Oct",
    words: [
      { term: "plot", count: 6 },
      { term: "hay", count: 12 },
      { term: "twist", count: 8 },
      { term: "ending", count: 5 },
      { term: "villain", count: 2 },
      { term: "chương", count: 4 },
    ],
  },
  {
    key: "11",
    label: "Nov",
    words: [
      { term: "hay", count: 10 },
      { term: "twist", count: 3 },
      { term: "ending", count: 11 },
      { term: "romance", count: 6 },
      { term: "chương", count: 5 },
      { term: "update", count: 4 },
    ],
  },
];

function Insights4CloudExample() {
  return (
    <div id="insights4-cloud">
      <WordCloud
        periods={insights4Months}
        text={{
          periods: "Month",
          cloud: (period) => `Frequent words in comments, ${period.label}`,
          word: (word, change) =>
            `“${word.term}”: ${word.count} comments${change === null ? " · new" : ` · ${change >= 0 ? "+" : ""}${change}`}`,
          idle: "Pick a word to see how many comments mention it.",
          empty: "No words this month.",
        }}
      />
    </div>
  );
}

const insights4Titles = ["The Lantern Keeper", "Library of Ashes", "Studio Nights", "Salt Roads", "Paper Moon"];
const insights4Frames: RaceFrame[] = [
  [40, 32, 28, 15, 9],
  [44, 41, 30, 22, 10],
  [46, 52, 31, 30, 18],
  [47, 60, 33, 41, 26],
  [49, 64, 35, 50, 39],
].map((scores, day) => ({
  key: `d${day}`,
  label: `Nov ${day + 1}`,
  bars: scores
    .map((value, i) => ({ id: `s${i}`, label: insights4Titles[i] ?? "", value }))
    .sort((a, b) => b.value - a.value),
}));

function Insights4RaceExample() {
  return (
    <div id="insights4-race">
      <BarRace
        frames={insights4Frames}
        rows={4}
        text={{
          label: "Ranks by day",
          play: "Play",
          pause: "Pause",
          scrubber: "Day",
          bar: (rank, bar, value) => `${rank}. ${bar.label}, ${value} points`,
        }}
      />
    </div>
  );
}

const insights4Slope: SlopeItem[] = (() => {
  const first = insights4Frames[0]?.bars ?? [];
  const last = insights4Frames.at(-1)?.bars ?? [];
  return last.map((bar, i) => {
    const before = first.findIndex((b) => b.id === bar.id);
    return {
      id: bar.id,
      label: bar.label,
      from: before < 0 ? null : { rank: before + 1, score: first[before]?.value ?? 0 },
      to: { rank: i + 1, score: bar.value },
    };
  });
})();

function Insights4SlopeExample() {
  return (
    <div id="insights4-slope">
      <SlopeChart
        items={insights4Slope}
        text={{
          label: "Today's ranks against 4 days ago",
          fromLabel: "Nov 1",
          toLabel: "Nov 5",
          modes: "Axis",
          rank: "Rank",
          score: "Score",
          item: (item) => `${item.label}: #${item.from?.rank ?? "new"} → #${item.to.rank}`,
          idle: "Pick a story to see how far it moved.",
        }}
      />
    </div>
  );
}

const insights4TrendA: TrendingTerm[] = [
  { term: "rồng lửa", rank: 1, change: 2 },
  { term: "kiếm hiệp", rank: 2, change: null },
  { term: "tiên hiệp", rank: 3, change: -1 },
  { term: "học đường", rank: 4, change: 0 },
  { term: "trinh thám", rank: 5, change: 1 },
];
const insights4TrendB: TrendingTerm[] = [
  { term: "kiếm hiệp", rank: 1, change: null },
  { term: "rồng lửa", rank: 2, change: 1 },
  { term: "tiên hiệp", rank: 3, change: -1 },
  { term: "trinh thám", rank: 4, change: 2 },
  { term: "học đường", rank: 5, change: -1 },
];

function Insights4TrendingExample() {
  const [refreshed, setRefreshed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div id="insights4-trending" className="flex max-w-md flex-col gap-2">
      <TrendingTerms
        items={refreshed ? insights4TrendB : insights4TrendA}
        onPick={setPicked}
        text={{
          title: "Trending",
          open: "Show trending searches",
          close: "Hide trending searches",
          list: "Most searched terms of the last 7 days",
          isNew: "new",
          up: (n) => `up ${n}`,
          down: (n) => `down ${n}`,
          same: "same place",
          pick: (term) => `Search for “${term}”`,
        }}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setRefreshed((r) => !r)}>
          Refresh the list
        </Button>
        {picked ? <span className="text-sm text-muted-foreground">Searching: {picked}</span> : null}
      </div>
    </div>
  );
}

const insights4Buckets: HistogramBucket[] = [
  { key: "0", label: "under 2k words", edge: "0", count: 14 },
  { key: "1", label: "2k to 10k words", edge: "2k", count: 38 },
  { key: "2", label: "10k to 30k words", edge: "10k", count: 52 },
  { key: "3", label: "30k to 60k words", edge: "30k", count: 31 },
  { key: "4", label: "60k to 100k words", edge: "60k", count: 18 },
  { key: "5", label: "100k to 200k words", edge: "100k", count: 9 },
  { key: "6", label: "200k to 400k words", edge: "200k", count: 4 },
  { key: "7", label: "400k words or more", edge: "400k", count: 2 },
];

function Insights4HistogramExample() {
  const [range, setRange] = useState<[number, number]>([1, 4]);
  return (
    <div id="insights4-histogram" className="max-w-md">
      <RangeHistogram
        buckets={insights4Buckets}
        value={range}
        onChange={setRange}
        text={{
          minThumb: "Shortest",
          maxThumb: "Longest",
          range: (from, to) => `${from.edge} – ${to.label.split(" to ").at(-1) ?? to.label}`,
          results: (n) => `${n} stories`,
        }}
      />
    </div>
  );
}

function Insights4FlowExample() {
  return (
    <div id="insights4-flow" className="max-w-md">
      <FlowSankey
        sources={[
          { key: "search", label: "Search", entered: 132, middle: 61, outcome: 18 },
          { key: "discover", label: "Discover", entered: 96, middle: 40, outcome: 9 },
          { key: "ranking", label: "Rankings", entered: 54, middle: 30, outcome: 11 },
        ]}
        text={{
          stages: ["Readers", "Read on", "Followed"],
          sources: "Source",
          all: (readers, followed) => `${readers} readers → ${followed} followed the story`,
          one: (source, percent) => `${source.label}: ${source.entered} → ${source.outcome} · ${percent}`,
        }}
      />
    </div>
  );
}

export function Gallery() {
  const toast = useAppToast();
  const { pathname } = useNavigation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <AppShell
      header={<span className="font-semibold tracking-tight">StoryNest · gallery</span>}
      bottomNav={
        <BottomNav
          label="Main navigation"
          pathname={pathname}
          LinkComponent={AppLink}
          items={[
            { href: "/", label: "Home", icon: Home },
            { href: "/dev/gallery", label: "Gallery", icon: Search },
            { href: "/library", label: "Library", icon: Library },
            { href: "/me", label: "Me", icon: User },
          ]}
        />
      }
    >
      <PageHeader title="Component gallery" description="Every shared primitive and widget, light and dark." />
      <Separator className="my-4" />

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="touch">Touch target</Button>
          <Button disabled>Disabled</Button>
          <SaveToggleExample />
        </div>
      </Section>

      <Section title="Motion">
        <MotionExamples />
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-sm gap-3">
          <Input placeholder="Input" />
          <Textarea placeholder="Textarea" />
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="romance">Romance</SelectItem>
              <SelectItem value="fantasy">Fantasy</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox /> Mature content
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch /> Public story
          </label>
        </div>
        <FormExample />
      </Section>

      <Section title="Display">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>New</Badge>
          <Badge variant="secondary">Ongoing</Badge>
          <Badge variant="outline">Draft</Badge>
          <Badge variant="destructive">Mature</Badge>
          <Avatar>
            <AvatarFallback>SN</AvatarFallback>
          </Avatar>
          <StatPill icon={Eye} value={1234} label="Reads" />
          <StatPill icon={Heart} value={56} label="Votes" />
          <Skeleton className="h-8 w-32" />
        </div>
      </Section>

      <Section title="Navigation and overlays">
        <Tabs defaultValue="about" className="max-w-md">
          <TabsList>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
          </TabsList>
          <TabsContent value="about" className="text-sm text-muted-foreground">
            Story synopsis goes here.
          </TabsContent>
          <TabsContent value="chapters" className="text-sm text-muted-foreground">
            Chapter list goes here.
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogDescription>Dialog description.</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet title</SheetTitle>
                <SheetDescription>Bottom sheets and side panels.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Helpful hint</TooltipContent>
          </Tooltip>
          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Confirm dialog
          </Button>
          <Button variant="outline" onClick={() => toast.success("Saved")}>
            Toast success
          </Button>
          <Button variant="outline" onClick={() => toast.error("Something failed")}>
            Toast error
          </Button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Unpublish this chapter?"
          description="Readers will no longer see it. You can publish it again later."
          confirmLabel="Unpublish"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => new Promise((resolve) => setTimeout(resolve, 500))}
        />
      </Section>

      <Section title="States">
        <EmptyState
          icon={BookOpen}
          title="Your library is empty"
          description="Save stories to find them here."
          action={<Button>Browse stories</Button>}
        />
        <ErrorState
          title="Could not load stories"
          description="Check your connection and try again."
          onRetry={() => toast.info("Retrying…")}
          retryLabel="Retry"
        />
      </Section>

      <Section title="Infinite list">
        <InfiniteExample />
      </Section>

      <Section title="Form error summary">
        <FormErrorSummaryExample />
      </Section>

      <Section title="Card carousel">
        <CardCarouselExample />
      </Section>

      <Section title="Image crop">
        <ImageCropExample />
      </Section>

      <Section title="Mega nav (md and up only)">
        <MegaNavExample />
      </Section>

      <Section title="Stats: synced small multiples and funnel">
        <StatsExample />
      </Section>

      <Section title="Sharing">
        <SharingExample />
      </Section>

      <Section title="Reading: expandable text and sticky action bar">
        <ReadingExample />
      </Section>

      <Section title="Editor: find and replace, merge choice, scheduled outbox">
        <FindReplaceExample />
        <MergeChoiceExample />
        <ScheduledOutboxExample />
      </Section>

      <Section title="Batch 2 · stats">
        <Batch2StatsExample />
      </Section>

      <Section title="Batch 2 · manage">
        <ManageListExample />
        <ManageGridExample />
        <DiffFoldsExample />
        <DetailPanelExample />
      </Section>

      <Section title="Batch 2 · account">
        <div id="batch2-account">
          <AccountBatchExample />
        </div>
      </Section>

      <Section title="Batch 2 · browse">
        <BrowseHeaderSearchExample />
        <BrowseRollingExample />
        <BrowseFeaturedExample />
        <BrowseGridExample />
        <BrowseShelfExample />
      </Section>

      <Section title="Batch 2 · reader">
        <ReaderToolsExample />
      </Section>

      <Section title="Batch 2 · authoring">
        <AuthoringPublishExample />
        <AuthoringVisibilityExample />
        <AuthoringSearchPreviewExample />
        <AuthoringUnsavedExample />
        <AuthoringToolbarExample />
        <AuthoringTourExample />
        <AuthoringSplitExample />
        <AuthoringResponsiveExample />
      </Section>

      <Section title="Batch 3 · stats3">
        <Batch3StatsScatterExample />
      </Section>

      <Section title="Batch 3 · browse3">
        <Browse3TitleExample />
        <Browse3PadlockExample />
        <Browse3CoverStackExample />
        <Browse3RevealExample />
      </Section>

      <Section title="Batch 3 · studio3">
        <Studio3AlertsExample />
        <Studio3SubmitExample />
        <Studio3CrumbsExample />
      </Section>

      <Section title="Batch 3 · reader3">
        <Reader3ToolbarExample />
        <Reader3SettingsExample />
        <Reader3ContentsExample />
        <Reader3FinishExample />
        <Reader3RangesExample />
      </Section>

      <Section title="Batch 3 · shell3">
        <Shell3LockoutExample />
        <Shell3AvailabilityExample />
        <Shell3RetryExample />
        <Shell3IntroExample />
        <Shell3PaletteExample />
      </Section>

      <Section title="Batch 3 · community3">
        <Community3NotificationsExample />
        <Community3ReportExample />
        <Community3UploadExample />
        <Community3SwipeExample />
      </Section>

      <Section title="Batch 4 · habits4">
        <Habits4Example />
      </Section>

      <Section title="Batch 4 · platform4">
        <Platform4BannerExample />
        <Platform4PopupExample />
        <Platform4SettingsExample />
        <Platform4MatrixExample />
      </Section>

      <Section title="Batch 4 · insights4">
        <Insights4RangeExample />
        <Insights4CohortExample />
        <Insights4WaffleExample />
        <Insights4CloudExample />
        <Insights4RaceExample />
        <Insights4SlopeExample />
        <Insights4TrendingExample />
        <Insights4HistogramExample />
        <Insights4FlowExample />
      </Section>
    </AppShell>
  );
}
