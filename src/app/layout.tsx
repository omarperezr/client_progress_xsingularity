import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Overpass_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const overpassMono = Overpass_Mono({
  variable: "--font-overpass-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Client Progress · xSingularity",
  description: "Track the progress of your xSingularity projects in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${overpassMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div
          hidden
          aria-hidden="true"
          // Direction contract: must survive the production build as real markup.
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: A commissioned project is a tracked consignment - manifest lines,
checkpoints, an ETA, a stamp when it lands. Refuses the dark-zinc SaaS
card dashboard this category ships by default.
OWN-WORLD: Night dispatch, dark-only: near-black desk (#131110) and dark
waybill sheets (#1d1b17) ruled in light paper ink (#ece8dd); international
orange commits actions; blue = in transit, green = delivered, hazard yellow
= inspection. Barlow / Barlow Condensed caps labels / Overpass Mono data.
Field boxes, route lines with checkpoint dots, rubber status stamps.
STORY: A client signs in, reads their project as a waybill - where it is,
who carries it, when it lands - and files a note on any line item.
FIRST VIEWPORT: Header plate, "Project manifest" heading, waybill cards:
consignment no., route line kickoff to ETA, three field boxes, status stamp.
Primary action = each card.
FORM: Freight manifest, candidate 3 of 7, seed 51a9910b.
FINISH: unreviewed and undocumented is unfinished; this build ends with
the finish review, the verdict, and DESIGN.md.
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
