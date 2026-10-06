import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Printer, RefreshCw } from "lucide-react";

export default function ProductPassport() {
  const { id } = useParams<{ id: string }>();
  const printRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";
  const printStarted = useRef(false);
  const passportId = Number(id);
  const validPassportId = Number.isInteger(passportId) && passportId > 0;
  const passport = trpc.assets.getPassport.useQuery({ id: passportId }, {
    enabled: validPassportId,
    retry: (failureCount, error) => error.data?.code !== "NOT_FOUND" && failureCount < 1,
  });
  const canonicalUrl = typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}#/passport/${id}`;

  useEffect(() => {
    if (!passport.data || !printRequested || printStarted.current) return;

    printStarted.current = true;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [passport.data, printRequested]);

  useEffect(() => {
    if (!passport.data) return;
    const previousTitle = document.title;
    document.title = `${passport.data.name} product passport`;
    return () => {
      document.title = previousTitle;
    };
  }, [passport.data]);

  if (!validPassportId) {
    return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Invalid product passport link</h1><p className="mt-2 text-muted-foreground">Check the QR code or passport URL and try again.</p></main>;
  }
  if (passport.isLoading) return <main className="flex min-h-screen items-center justify-center"><div className="flex items-center gap-3 text-sm text-muted-foreground" role="status"><RefreshCw aria-hidden="true" className="h-6 w-6 animate-spin" />Loading product passport…</div></main>;
  if (passport.isError) {
    const notFound = passport.error.data?.code === "NOT_FOUND";
    return <main className="mx-auto max-w-3xl p-8"><div role="alert"><h1 className="text-2xl font-bold">{notFound ? "Product passport not found" : "Product passport unavailable"}</h1><p className="mt-2 text-muted-foreground">{notFound ? "This passport may have been removed or the QR code may be incorrect." : "The passport service could not be reached. Try again without replacing the QR label."}</p>{!notFound && <Button className="mt-4" variant="outline" onClick={() => void passport.refetch()}>Try again</Button>}</div></main>;
  }
  if (!passport.data) return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-bold">Product passport not found</h1></main>;
  const item = passport.data;
  const manufacturerAddress = [
    item.manufacturerStreet,
    [item.manufacturerZipcode, item.manufacturerCityTown].filter(Boolean).join(" "),
    item.manufacturerNationalCode,
  ].filter(Boolean).join(", ");
  const rows = [
    ["Product", item.name], ["Product type", item.assetType.replaceAll("_", " ")], ["Manufacturer", item.manufacturer],
    ["Manufacturer address", manufacturerAddress], ["Model", item.model],
    ["Serial number", item.serialNumber], ["Article number", item.manufacturerArticleNumber],
    ["Order code", item.orderCodeOfManufacturer], ["Rated value", [item.ratedValue, item.ratedUnit].filter(Boolean).join(" ")],
    ["Lifecycle stage", item.lifecycleStage], ["AAS revision", String(item.aasVersion)],
    ["Last updated", new Date(item.updatedAt).toLocaleString()],
  ].filter((row) => row[1]);

  return <main className="eudpp-page min-h-screen bg-background p-4 text-foreground print:min-h-0 print:bg-white print:p-0 print:text-black">
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex justify-end print:hidden"><Button type="button" onClick={() => window.print()}><Printer aria-hidden="true" className="mr-2 h-4 w-4" />Print EUDPP and QR label</Button></div>
      <Card className="print:break-inside-avoid print:border-black print:shadow-none">
        <CardHeader><p className="text-sm uppercase tracking-widest text-muted-foreground print:text-gray-700">EU Digital Product Passport (EUDPP)</p><h1 className="text-3xl font-semibold leading-tight">{item.name}</h1></CardHeader>
        <CardContent className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_220px]">
          <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-1 gap-1 border-b pb-2 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-3"><dt className="text-sm text-muted-foreground print:text-gray-700">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl>
          <figure data-testid="passport-qr" data-qr-value={canonicalUrl} className="space-y-3 text-center" aria-label={`Scannable public passport link for ${item.name}`}>
            <div className="inline-block rounded-lg border bg-white p-3"><QRCodeSVG aria-label={`Passport QR code for ${item.name}`} role="img" value={canonicalUrl} size={190} level="H" title={`Passport QR code for ${item.name}`} /></div>
            <figcaption>
              <p className="break-all font-mono text-[10px]">{canonicalUrl}</p>
              <p className="mt-2 break-all font-mono text-xs">{item.assetId}</p>
            </figcaption>
          </figure>
        </CardContent>
      </Card>
      <Card className="print:break-inside-avoid print:border-black print:shadow-none"><CardHeader><h2 className="text-xl font-semibold">Use, repair, and end of life</h2></CardHeader><CardContent className="space-y-3 text-sm">
        <p>Disconnect the battery before inspection or repair. Servo motion commanded by software is not a safety function or emergency stop.</p>
        <p>Keep the frame, fasteners, controller, wiring, battery, and five servos separated by material stream where local recycling rules permit. Record replacements and maintenance in the linked AAS history.</p>
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3"><strong>Regulatory status:</strong> voluntary prototype passport. It is not, by itself, evidence of ESPR conformity, CE conformity, or compliance with a future product-group delegated act.</p>
      </CardContent></Card>
    </div>
  </main>;
}
