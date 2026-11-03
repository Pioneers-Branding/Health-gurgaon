import type { Metadata } from "next";
import { Avatar, PhotoPlaceholder } from "@/components/ui/avatar";
import {
  Badge,
  NotSponsoredBadge,
  OwnershipBadge,
  SponsoredTag,
  VerificationBadge,
  type BadgeTone,
} from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button, ButtonAnchor, ButtonLink, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardLink } from "@/components/ui/card";
import { ChipButton, ChipLink, ChipRow, Tag } from "@/components/ui/chip";
import { Container } from "@/components/ui/container";
import { Disclaimer } from "@/components/ui/disclaimer";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, ChoiceCards, ChoiceChips, Field, Input, RadioGroup, Select, Textarea, Toggle } from "@/components/ui/form";
import { FreshnessStamp } from "@/components/ui/freshness-stamp";
import { Logo, LogoMark } from "@/components/ui/logo";
import { MonoLabel, type MonoTone } from "@/components/ui/mono-label";
import { MapPlaceholder, SchematicMap } from "@/components/ui/schematic-map";
import { ArrowLink, SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceNote } from "@/components/ui/source-note";
import { SponsoredBox } from "@/components/ui/sponsored-box";
import { StatusTimeline } from "@/components/ui/status-timeline";
import { Stepper } from "@/components/ui/stepper";
import { SubmitButton } from "@/components/ui/submit-button";
import { TabLinks } from "@/components/ui/tab-links";
import { Tabs } from "@/components/ui/tabs";
import { SearchTrigger } from "@/components/shell/search-overlay";
import { getDictionary } from "@/lib/i18n";
import { pageMetadata } from "@/lib/i18n/metadata";
import { getLang } from "@/lib/i18n/server";
import { routes } from "@/lib/routes";
import { Demo, Section, Swatches } from "./tokens";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = getDictionary(lang).pages.styleguide;
  return pageMetadata({ lang, href: (l) => routes.styleguide(l), title: t.title, description: t.description, noindex: true });
}

const SAMPLE_DATE = "2026-10-12T10:00:00+05:30";

const TEXT_SIZES = ["10.5", "11.5", "12.5", "13.5", "14.5", "15", "16", "18", "22", "26", "30", "38", "56"] as const;
const TEXT_CLASS: Record<(typeof TEXT_SIZES)[number], string> = {
  "10.5": "text-10.5",
  "11.5": "text-11.5",
  "12.5": "text-12.5",
  "13.5": "text-13.5",
  "14.5": "text-14.5",
  "15": "text-15",
  "16": "text-16",
  "18": "text-18",
  "22": "text-22",
  "26": "text-26",
  "30": "text-30",
  "38": "text-38",
  "56": "text-56",
};
const RADII = ["6", "10", "12", "14", "18", "20", "24", "28"] as const;
const RADIUS_CLASS: Record<(typeof RADII)[number], string> = {
  "6": "rounded-6",
  "10": "rounded-10",
  "12": "rounded-12",
  "14": "rounded-14",
  "18": "rounded-18",
  "20": "rounded-20",
  "24": "rounded-24",
  "28": "rounded-28",
};
const VARIANTS: ButtonVariant[] = ["primary", "dark", "outline", "soft", "ghost", "saffron", "danger"];
const SIZES: ButtonSize[] = ["sm", "md", "lg", "xl"];
const BADGE_TONES: BadgeTone[] = ["success", "pending", "neutral", "white", "dark", "gov", "caution", "info", "emergency", "saffron"];
const MONO_TONES: MonoTone[] = ["subtle", "teal", "caution", "success", "emergency", "ink"];

export default async function StyleguidePage() {
  const lang = await getLang();
  const dict = getDictionary(lang);
  const home = routes.home(lang);

  return (
    <>
      <div className="border-b border-line bg-cream">
        <Container className="flex flex-col gap-3 py-10">
          <MonoLabel tone="teal" size="11">
            HealthGurgaon · design system
          </MonoLabel>
          <h1 className="text-38 leading-[1.05] font-bold tracking-h1">{dict.pages.styleguide.title}</h1>
          <p className="max-w-[45rem] text-16 leading-[1.6] font-light text-muted">
            Tokens live in <code className="font-mono text-14">src/app/globals.css</code>; components in{" "}
            <code className="font-mono text-14">src/components/ui</code>. Class names follow the prototype&apos;s pixel values:{" "}
            <code className="font-mono text-14">text-13.5</code> is 13.5px, <code className="font-mono text-14">rounded-20</code> is
            20px. Not indexed. See docs/FRONTEND.md.
          </p>
          <nav aria-label="Sections" className="flex flex-wrap gap-x-4 text-14">
            {["colours", "type", "shape", "buttons", "chips", "cards", "badges", "trust", "navigation", "progress", "forms", "feedback", "media", "maps"].map(
              (id) => (
                <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center capitalize">
                  {id}
                </a>
              ),
            )}
          </nav>
        </Container>
      </div>

      <Container className="flex flex-col gap-12 py-10">
        <Section id="colours" title="Colours" intro="The default Tailwind palette is switched off: use these names (bg-cream, text-muted, border-line…). High contrast mode redefines the text, line and teal tokens.">
          <Swatches
            title="Core"
            items={[
              { name: "ink", hex: "#2B1D14", note: "Text, dark buttons, dark bands" },
              { name: "cream", hex: "#FBF4E8", note: "Soft panels, hero bands" },
              { name: "teal", hex: "#0F766E", note: "Links, primary buttons" },
              { name: "teal-dark", hex: "#0B5E57", note: "Primary hover, RWA tiles" },
              { name: "saffron", hex: "#F0B43C", note: "Accent, on-dark links" },
              { name: "white", hex: "#FFFFFF", note: "Cards, page" },
            ]}
          />
          <Swatches
            title="Text and lines"
            items={[
              { name: "ink-soft", hex: "#3D2E22", note: "Body detail text" },
              { name: "muted", hex: "#5A473A", note: "Descriptions" },
              { name: "subtle", hex: "#6E5A4B", note: "Captions, mono labels" },
              { name: "line", hex: "#EFE3CF", note: "Card hairlines" },
              { name: "line-strong", hex: "#E8DCC8", note: "Inputs, chips, soft buttons" },
              { name: "sand", hex: "#F6ECDC", note: "Placeholder stripes" },
            ]}
          />
          <Swatches
            title="Status"
            items={[
              { name: "emergency", hex: "#B42318", note: "112, errors" },
              { name: "emergency-tint", hex: "#FBEDEB", note: "Error panels" },
              { name: "success", hex: "#1E7A4F", note: "Checked / verified text" },
              { name: "success-tint", hex: "#E6F1EC", note: "Verified badges" },
              { name: "caution", hex: "#9A5418", note: "Charitable, cautions" },
              { name: "pending", hex: "#7A5200", note: "Awaiting review text" },
              { name: "pending-tint", hex: "#FFF4D6", note: "Awaiting review fill" },
              { name: "sponsored", hex: "#C99A2E", note: "Sponsored dashed border" },
              { name: "sponsored-tint", hex: "#FFFBF0", note: "Sponsored fill" },
              { name: "gov", hex: "#2C4F9E", note: "Government" },
            ]}
          />
          <Swatches
            title="On dark surfaces"
            items={[
              { name: "on-dark", hex: "#E8DCCB", note: "Text on ink" },
              { name: "on-dark-muted", hex: "#C9B8A4", note: "Small print on ink" },
              { name: "night-raise", hex: "#3A2A1E", note: "Raised tiles on ink" },
              { name: "night-line", hex: "#4A3A2E", note: "Hairlines on ink" },
            ]}
          />
        </Section>

        <Section id="type" title="Typography" intro="Lexend for text, Spline Sans Mono for small uppercase labels, Mukta for Hindi (applied automatically on /hi pages). Sizes are rem-based, so Larger text scales everything.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
            <Card>
              <MonoLabel>font-sans · Lexend 300–700</MonoLabel>
              <p className="text-22 font-light">Light 300 · Find care</p>
              <p className="text-22">Regular 400 · Find care</p>
              <p className="text-22 font-medium">Medium 500 · Find care</p>
              <p className="text-22 font-semibold">Semibold 600 · Find care</p>
              <p className="text-22 font-bold">Bold 700 · Find care</p>
            </Card>
            <Card>
              <MonoLabel>font-mono · Spline Sans Mono 400/500</MonoLabel>
              <p className="font-mono text-14">LAST CHECKED 12 OCT 2026</p>
              <p className="mono-label text-10.5 text-subtle">mono-label text-10.5 · registration</p>
              <MonoLabel tone="teal">MonoLabel component</MonoLabel>
            </Card>
            <Card>
              <MonoLabel>font-hindi · Mukta 500/700</MonoLabel>
              <p lang="hi" className="font-hindi text-22 font-medium">
                अपने इलाके में स्वास्थ्य सेवाएं खोजें।
              </p>
              <p lang="hi" className="font-hindi text-16 font-bold">
                गुरुग्राम · सत्यापित स्थानीय स्वास्थ्य सेवाएं
              </p>
            </Card>
          </div>
          <Demo label="Type scale (name = px at 100%)" code="text-10.5 … text-56" className="flex-col items-start gap-1.5">
            {TEXT_SIZES.map((size) => (
              <p key={size} className={`${TEXT_CLASS[size]} leading-tight`}>
                <span className="font-mono text-11 text-subtle">text-{size}</span> Healthcare near you
              </p>
            ))}
          </Demo>
          <Demo label="Tracking" code="tracking-display · h1 · h2 · h3 · title · card · snug · mono" className="flex-col items-start gap-1">
            <p className="text-30 font-bold tracking-display">tracking-display −.045em</p>
            <p className="text-30 font-bold tracking-h1">tracking-h1 −.04em</p>
            <p className="text-30 font-bold tracking-h2">tracking-h2 −.035em</p>
            <p className="text-24 font-bold tracking-h3">tracking-h3 −.03em</p>
            <p className="text-19 font-semibold tracking-title">tracking-title −.02em</p>
            <p className="text-17 font-semibold tracking-card">tracking-card −.015em</p>
          </Demo>
        </Section>

        <Section id="shape" title="Shape, spacing, layout" intro="Content column max 1240px (max-w-page) with 24px gutters (px-6). Cards radius 20, pills 999. Every tap target is at least 44px (min-h-11). Spacing uses the 4px scale with quarter steps: p-4.5 = 18px, px-2.75 = 11px.">
          <Demo label="Radii" code="rounded-6 … rounded-28 · rounded-card · rounded-pill">
            {RADII.map((r) => (
              <div key={r} className={`${RADIUS_CLASS[r]} flex size-20 items-end justify-center border border-line-strong bg-cream pb-2`}>
                <span className="font-mono text-11 text-subtle">{r}</span>
              </div>
            ))}
            <div className="flex h-11 items-center rounded-pill border border-line-strong bg-cream px-4 font-mono text-11 text-subtle">pill</div>
          </Demo>
          <Demo label="Shadows and stripes" code="shadow-float · shadow-menu · bg-stripes">
            <div className="h-20 w-40 rounded-20 bg-white shadow-float" />
            <div className="h-20 w-40 rounded-20 bg-white shadow-menu" />
            <div className="h-20 w-40 rounded-20 bg-stripes" />
          </Demo>
        </Section>

        <Section id="buttons" title="Buttons" intro="Button (a <button>), ButtonLink (internal link) and ButtonAnchor (tel:, mailto:, outside sites) share one look. Default variant is dark.">
          {SIZES.map((size) => (
            <Demo key={size} label={`size ${size}`} code={`<Button variant="…" size="${size}">`}>
              {VARIANTS.map((v) => (
                <Button key={v} variant={v} size={size}>
                  {v}
                </Button>
              ))}
            </Demo>
          ))}
          <Demo label="On dark bands" code='variant="cream" · "outlineLight" · "saffron"' className="bg-teal">
            <Button variant="cream">Register your society</Button>
            <Button variant="outlineLight">See how it works</Button>
            <Button variant="saffron">All top lists →</Button>
          </Demo>
          <Demo label="Links, shapes, states" code='<ButtonLink> · <ButtonAnchor href="tel:112"> · shape="rounded" · disabled'>
            <ButtonLink href={home}>ButtonLink</ButtonLink>
            <ButtonAnchor href="tel:112" variant="danger">
              SOS 112
            </ButtonAnchor>
            <Button variant="saffron" shape="rounded">
              shape rounded
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="primary" full className="max-w-80">
              full width
            </Button>
          </Demo>
        </Section>

        <Section id="chips" title="Chips and tags" intro="ChipButton toggles client state (aria-pressed); ChipLink is a filter that is a URL (works without JavaScript); Tag is a static pill.">
          <Demo label="ChipButton / ChipLink" code="<ChipButton selected> · <ChipLink selected href>">
            <ChipRow label="Type">
              <ChipButton selected>All</ChipButton>
              <ChipButton>Doctors</ChipButton>
              <ChipButton>Hospitals</ChipButton>
              <ChipLink href={routes.search(lang, { type: "lab" })}>Labs (link)</ChipLink>
              <ChipLink href={routes.search(lang, { type: "pharmacy" })} selected>
                Chemists (link, on)
              </ChipLink>
            </ChipRow>
          </Demo>
          <Demo label="Tag" code='<Tag tone="cream | outline | type | white">'>
            <Tag>Newborn & well-baby check-ups</Tag>
            <Tag tone="outline">Paediatrics</Tag>
            <Tag tone="type">Large hospital</Tag>
            <Tag tone="white">Not sponsored</Tag>
          </Demo>
        </Section>

        <Section id="cards" title="Cards" intro="White with a 1px hairline and radius 20 by default. CardLink makes the whole card a link with the teal hover ring.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3.5">
            <Card>
              <MonoLabel>tone default</MonoLabel>
              <p className="text-15 font-medium">Haryana Medical Council · Reg. no. HMC-XXXXX (sample)</p>
              <SourceNote lang={lang} source="Matched on council register" date={SAMPLE_DATE} />
            </Card>
            <Card tone="cream">
              <MonoLabel>tone cream</MonoLabel>
              <p className="text-15 font-semibold">Are you Dr. Ananya Rao?</p>
              <p className="text-13.5 leading-normal font-light text-muted">Claim this free profile to update timings and services.</p>
            </Card>
            <Card tone="dark">
              <MonoLabel tone="saffron">tone dark</MonoLabel>
              <p className="text-16 font-medium">The Gurgaon Health Report</p>
            </Card>
            <Card tone="outline">
              <MonoLabel>tone outline</MonoLabel>
              <p className="font-semibold">Is something wrong here?</p>
              <Button variant="outline" size="sm" className="self-start">
                Suggest a correction
              </Button>
            </Card>
            <CardLink href={home}>
              <MonoLabel>CardLink</MonoLabel>
              <p className="text-16 font-semibold tracking-card">Whole card is a link</p>
              <p className="text-13 font-light text-muted">Hover for the 2px teal ring.</p>
            </CardLink>
          </div>
        </Section>

        <Section id="badges" title="Badges" intro="Verification badges must be backed by a stored check. Sponsored content is always labelled and kept apart from results.">
          <Demo label="VerificationBadge" code='<VerificationBadge kind="registration" lang={lang} />'>
            <VerificationBadge kind="registration" lang={lang} />
            <VerificationBadge kind="facility" lang={lang} />
            <VerificationBadge kind="organiser" lang={lang} />
            <VerificationBadge kind="credentials" lang={lang} />
            <VerificationBadge kind="hours" lang={lang} />
            <VerificationBadge kind="community" lang={lang} />
            <VerificationBadge kind="facility" lang={lang} label="Clinic address checked" size="md" />
          </Demo>
          <Demo label="Ownership, sponsorship" code="<OwnershipBadge> · <SponsoredTag> · <NotSponsoredBadge>">
            <OwnershipBadge ownership="private" lang={lang} />
            <OwnershipBadge ownership="government" lang={lang} />
            <OwnershipBadge ownership="charitable" lang={lang} />
            <OwnershipBadge ownership="ppp" lang={lang} />
            <SponsoredTag lang={lang} />
            <NotSponsoredBadge lang={lang} />
          </Demo>
          <Demo label="Badge tones" code='<Badge tone="…" size="sm | md | lg">'>
            {BADGE_TONES.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
            <Badge tone="success" size="lg">
              size lg
            </Badge>
          </Demo>
        </Section>

        <Section id="trust" title="Sources and freshness" intro="Trust first: every fact shows its source and the date it was checked.">
          <Demo label="MonoLabel" code='<MonoLabel tone="…">'>
            {MONO_TONES.map((tone) => (
              <MonoLabel key={tone} tone={tone}>
                {tone}
              </MonoLabel>
            ))}
          </Demo>
          <Demo label="FreshnessStamp" code='<FreshnessStamp date={…} lang={lang} kind="lastChecked" />'>
            <FreshnessStamp date={SAMPLE_DATE} lang={lang} />
            <FreshnessStamp date={SAMPLE_DATE} lang={lang} kind="lastChecked" />
            <FreshnessStamp date={SAMPLE_DATE} lang={lang} tone="success" precision="month" size="10" />
          </Demo>
          <Demo label="SourceNote" code='<SourceNote lang={lang} source="Confirmed by clinic" date={…} />' className="flex-col items-start gap-1">
            <SourceNote lang={lang} source="Confirmed by clinic" date={SAMPLE_DATE} />
            <SourceNote lang={lang} source="Stated by doctor" tone="stated" />
            <SourceNote lang={lang} source="Source: district health advisory" tone="muted" />
          </Demo>
          <Demo label="Disclaimer" code='<Disclaimer lang={lang} kinds={["medical", "listing"]} />'>
            <Disclaimer lang={lang} kinds={["medical", "listing"]} />
          </Demo>
        </Section>

        <Section id="navigation" title="Navigation" intro="Breadcrumbs add “Gurugram” for you. TabLinks are URL tabs; Tabs is the in-page ARIA pattern (a Client Component).">
          <Demo label="Breadcrumbs" code="<Breadcrumbs lang items={[…]} />">
            <Breadcrumbs lang={lang} items={[{ label: "Paediatrics", href: routes.specialty(lang, "paediatrics") }, { label: "Dr. Ananya Rao" }]} />
          </Demo>
          <Demo label="TabLinks" code="<TabLinks label items />" className="block">
            <TabLinks
              label="Profile sections"
              items={[
                { label: "Overview", href: `${routes.styleguide(lang)}#navigation`, current: true },
                { label: "Reviews (18)", href: `${routes.styleguide(lang)}#badges` },
                { label: "Patient stories", href: `${routes.styleguide(lang)}#media`, marker: "Phase 2" },
              ]}
            />
          </Demo>
          <Demo label="Tabs (client)" code="<Tabs label items />" className="block">
            <Tabs
              label="Doctor profile sections"
              items={[
                { id: "overview", label: "Overview", content: <p className="text-14 font-light">Overview panel.</p> },
                { id: "timings", label: "Timings & location", content: <p className="text-14 font-light">Timings panel.</p> },
                { id: "verify", label: "Verification record", content: <p className="text-14 font-light">Verification panel.</p> },
              ]}
            />
          </Demo>
          <Demo label="SectionHeader + ArrowLink" code="<SectionHeader title kicker description action />" className="block">
            <SectionHeader
              kicker="Featured hospitals"
              title="Hospitals serving Sector 56"
              description="Chosen by our editors for coverage and access."
              action={<ArrowLink href={home}>All services</ArrowLink>}
            />
          </Demo>
          <Demo label="SectionHeader tone dark" code='tone="dark" size="xl"' className="block bg-ink">
            <SectionHeader tone="dark" size="xl" kicker="Top lists · October 2026" title="Ranked by verified patients" action={<ArrowLink href={home} tone="saffron">All top lists</ArrowLink>} />
          </Demo>
        </Section>

        <Section id="progress" title="Steps and status">
          <Demo label="Stepper" code="<Stepper lang steps current={2} />" className="block">
            <Stepper lang={lang} steps={["Find listing", "Your role", "Confirm", "Done"]} current={2} />
          </Demo>
          <Demo label="StatusTimeline" code="<StatusTimeline lang items />" className="block">
            <StatusTimeline
              lang={lang}
              items={[
                { title: "Received", description: "Listed as “awaiting review”, clearly labelled.", status: "done" },
                { title: "Organiser check", description: "We call the contact within 2 working days.", status: "next" },
                { title: "Verified & shared", description: "Added to the calendar and the weekly report.", status: "later" },
              ]}
            />
          </Demo>
        </Section>

        <Section id="forms" title="Forms" intro="Field wires the label, help and error to its control (id, aria-describedby, aria-invalid). Chips and cards are real radio/checkbox inputs, so forms work without JavaScript.">
          <form action={routes.styleguide(lang)} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-5 rounded-20 border border-line p-4.5">
            <Field id="sg-name" label="Which listing is this about?" help="Name of the clinic, lab or chemist">
              <Input name="item" placeholder="e.g. Little Steps Clinic" />
            </Field>
            <Field id="sg-locality" label="Locality" optional={dict.common.optional}>
              <Select name="locality" defaultValue="">
                <option value="">All of Gurugram</option>
                <option value="sector-56">Sector 56</option>
              </Select>
            </Field>
            <Field id="sg-text" label="What’s correct?" error="Tell us what’s correct." className="col-span-full">
              <Textarea name="text" />
            </Field>
            <Checkbox id="sg-consent" name="consent" label="I agree to receive one weekly message." description="Leave anytime by replying STOP." />
            <Toggle id="sg-open" name="open" label="Open now" />
            <RadioGroup
              name="sg-visit"
              legend="When did you visit?"
              defaultValue="month"
              options={[
                { value: "month", label: "This month" },
                { value: "older", label: "Earlier this year" },
              ]}
            />
            <ChoiceChips
              name="sg-clear"
              legend="Did the doctor explain things clearly?"
              defaultValue="yes"
              options={[
                { value: "yes", label: "Yes" },
                { value: "some", label: "Somewhat" },
                { value: "no", label: "No" },
              ]}
            />
            <ChoiceChips
              name="sg-langs"
              legend="Language spoken"
              legendStyle="mono"
              multiple
              defaultValue={["hi"]}
              options={[
                { value: "hi", label: "Hindi" },
                { value: "en", label: "English" },
                { value: "pa", label: "Punjabi" },
              ]}
            />
            <ChoiceCards
              name="sg-type"
              legend="What would you like to report?"
              defaultValue="fact"
              className="col-span-full"
              options={[
                { value: "fact", label: "A fact is wrong", description: "Timings, address, phone, fee, closed" },
                { value: "care", label: "A concern about care", description: "Treatment, behaviour, billing" },
                { value: "missing", label: "Something is missing", description: "A clinic we haven’t listed" },
              ]}
            />
            <div className="flex flex-wrap gap-2 col-span-full">
              <SubmitButton pendingLabel="Sending…">Submit (SubmitButton)</SubmitButton>
            </div>
          </form>
        </Section>

        <Section id="feedback" title="Callouts, sponsored, empty states">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
            <Callout title="tone info">Please don&apos;t include names of patients, phone numbers or diagnoses.</Callout>
            <Callout tone="success" title="tone success">Thank you. Your review is with a moderator.</Callout>
            <Callout tone="warning" title="tone warning">It looks like you’ve included a phone number.</Callout>
            <Callout tone="danger" title="tone danger">That code doesn’t match.</Callout>
            <Callout tone="dark" title="tone dark">High-emphasis note on ink.</Callout>
          </div>
          <SponsoredBox lang={lang}>
            <div className="flex flex-wrap items-center gap-3.5">
              <Avatar name="Sector 56 Care Hospital" size="lg" />
              <div className="flex flex-col gap-1">
                <p className="text-17.5 font-semibold tracking-card">Sector 56 Care Hospital (sample)</p>
                <p className="text-13 font-light text-ink-soft">Sector 56 · 0.9 km</p>
              </div>
            </div>
          </SponsoredBox>
          <EmptyState
            title="No recently verified listings in New Gurgaon yet."
            layout="row"
            actions={
              <>
                <Button variant="outline">Show Sector 56</Button>
                <ButtonLink href={routes.search(lang, { intent: "report" })} variant="primary">
                  Suggest a listing
                </ButtonLink>
              </>
            }
          >
            We only show what we&apos;ve checked. Try a nearby locality, or tell us about a clinic you use.
          </EmptyState>
        </Section>

        <Section id="media" title="Logo, avatars, photos, loading">
          <Demo label="Logo / LogoMark" code='<Logo size="sm | md | lg" tone="light | dark" />'>
            <Logo size="lg" />
            <Logo size="md" />
            <Logo size="sm" />
            <LogoMark size={44} />
          </Demo>
          <Demo label="Logo on dark" code='tone="dark"' className="bg-ink">
            <Logo size="md" tone="dark" />
            <Logo size="md" tone="dark" withMark={false} />
          </Demo>
          <Demo label="Avatar (initials)" code='<Avatar name="Dr. Ananya Rao" size="sm | md | lg" />'>
            <Avatar name="Dr. Ananya Rao" size="sm" />
            <Avatar name="Prakash Path Labs" size="md" />
            <Avatar name="Sai Medicos" size="lg" />
          </Demo>
          <Demo label="PhotoPlaceholder" code='<PhotoPlaceholder caption="PHOTO · …" className="h-40 rounded-20" />'>
            <PhotoPlaceholder caption="PHOTO · residents at a society health camp" className="h-40 w-full max-w-[22rem] rounded-20" />
            <PhotoPlaceholder small caption="PHOTO" captionPosition="bottom-center" className="size-28 rounded-28" />
          </Demo>
          <Demo label="Skeleton" code='<Skeleton className="h-6 w-48" />' className="flex-col items-start">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 w-full max-w-[24rem] rounded-20" />
          </Demo>
          <Demo label="Search overlay trigger (phones)" code="<SearchTrigger> · openSearch()">
            <SearchTrigger className="inline-flex min-h-11 items-center rounded-16 border-[1.5px] border-ink bg-cream px-3.5 text-14.5 text-subtle">
              {dict.home.searchPh}
            </SearchTrigger>
          </Demo>
        </Section>

        <Section id="maps" title="Maps" intro="Schematic, not-to-scale SVG maps sit in SchematicMap (the SVG is decorative; everything on it is also in a list). MapPlaceholder stands in until a map exists.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4">
            <SchematicMap label="Schematic map of Gurugram localities" caption="Not to scale. Every locality is also listed.">
              <svg viewBox="0 0 520 300" aria-hidden="true" focusable="false">
                <rect width="520" height="300" fill="#fff" />
                <path d="M40 30 C160 8 360 6 480 28 C510 120 505 230 470 280 C330 300 160 296 40 270 C14 200 18 100 40 30 Z" fill="#FBF4E8" stroke="#efe3cf" strokeWidth="2" />
                <path d="M372 0 L318 96 L262 196 L196 300" stroke="#e8dcc8" strokeWidth="14" fill="none" strokeLinecap="round" />
                <path d="M372 0 L318 96 L262 196 L196 300" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" />
                <path d="M446 40 L452 210" stroke="#0F766E" strokeWidth="5" fill="none" strokeLinecap="round" />
                <circle cx="300" cy="150" r="9" fill="#F0B43C" />
              </svg>
            </SchematicMap>
            <MapPlaceholder caption="MAP · verified locations only" />
          </div>
        </Section>
      </Container>
    </>
  );
}
