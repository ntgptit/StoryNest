"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Eye, Globe, Heart, Home, Library, Link2, Lock, Search, User } from "lucide-react";
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
import { ImageCropDialog, type CropArea } from "@storynest/ui/widgets/image-crop-dialog";
import { MegaNav, MegaNavSection, megaNavItemClass, type MegaNavEntry } from "@storynest/ui/widgets/mega-nav";
import { MergeChoice } from "@storynest/ui/widgets/merge-choice";
import { ScheduledOutbox, ScheduledOutboxItem } from "@storynest/ui/widgets/scheduled-outbox";
import { ShareDialog, type ShareAccessOption } from "@storynest/ui/widgets/share-dialog";
import { StickyActionBar } from "@storynest/ui/widgets/sticky-action-bar";
import { StoryCover } from "@storynest/ui/widgets/story-cover";
import { SyncedSmallMultiples, type SmallMultipleDay } from "@storynest/ui/widgets/synced-small-multiples";
import { CalendarHeatmap, type HeatmapCell, type HeatLevel } from "@storynest/ui/widgets/calendar-heatmap";

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
    </AppShell>
  );
}
