import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Skyline } from '@/components/brand/Illustrations';
import { WayfareLogo } from '@/components/brand/WayfarePin';

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <main id="main" className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-4 py-12">
        <Link to="/" className="tap self-start rounded-full" aria-label="Wayfare home"><WayfareLogo /></Link>
        <h1 className="type-display">{title}</h1>
        <div className="flex flex-col gap-4 type-body [&_h2]:type-heading-3 [&_h2]:mt-4">{children}</div>
        <Link to="/" className="inline-flex min-h-11 items-center self-start type-button-sm underline decoration-2 underline-offset-4">Back to Wayfare</Link>
      </main>
      <Skyline className="h-16" />
    </div>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy">
      <p>Wayfare is a student project from the Design Management Project at Heriot-Watt University Dubai. This page says plainly what the app keeps.</p>
      <h2>What we keep</h2>
      <p>Your first name, email, a hashed password, your university, your arrival date, your home country and currency, the Emirates ID status you choose, the tasks you mark done, your budget numbers, saved places, viewing requests, group posts and any broker reports you send.</p>
      <h2>What we never keep</h2>
      <p>Passport numbers, Emirates ID numbers or uploaded documents. Your location is used only on your phone and is never sent to us.</p>
      <h2>Your family link</h2>
      <p>If you create a family link, anyone with it can see your budget, chosen place and Day Zero plan, without contact details. Turn it off in Me at any time and the old link stops working.</p>
      <h2>Cookies and offline storage</h2>
      <p>One cookie keeps you signed in. The app saves your journey, budget and the transit map on your device so they work offline. There are no advertising or tracking cookies.</p>
      <h2>Your university</h2>
      <p>Your university's housing office sees viewing requests and broker reports for its listings. It does not see your budget.</p>
      <p className="type-body-sm text-ink-muted">Before public launch, the team must confirm this policy with the university and add a contact address.</p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms">
      <p>Wayfare is a guide, not a government service. It links to official sources such as ICP, RTA and Dubai Land Department. Rules, fees and timings change, so always check the official site before you go.</p>
      <h2>Listings</h2>
      <p>A Verified badge means your university's housing office checked the price and deposit against the source shown. It is not a guarantee. See the contract before you pay a deposit, and report anything that feels wrong.</p>
      <h2>Estimates</h2>
      <p>Journey times, fares and the Emirates ID timeline are estimates. Exchange rates come from Exchange Rate API and are shown with their date.</p>
      <h2>Community</h2>
      <p>Be kind and stay on topic. Posts can be reported and your university may remove them. There are no private messages between students.</p>
      <h2>Map data</h2>
      <p>Transit data © OpenStreetMap contributors, available under the Open Database License.</p>
      <p className="type-body-sm text-ink-muted">Before public launch, the team must confirm these terms with the university.</p>
    </Page>
  );
}
