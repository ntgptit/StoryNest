"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Eye, Heart, Home, Library, Search, User } from "lucide-react";
import { useState } from "react";
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
import { StatPill } from "@storynest/ui/widgets/stat-pill";

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
        </div>
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
    </AppShell>
  );
}
