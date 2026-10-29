"use client";

import { philosophy } from "@content/philosophy";
import type { Service } from "@content/schema";
import { services, servicesFooter, servicesIntro, servicesTitle } from "@content/services";
import { AppHeader, AppScreen, PushView, useLastValue } from "@/components/ui/app-shell";
import { ProminentButton, Row, Section } from "@/components/ui/grouped";
import { ServiceTile } from "@/components/apps/service-tile";
import { openApp } from "@/lib/router";
import { useOS } from "@/lib/store";

/*
 * Services, laid out like Settings: one inset-grouped list (a tile, the service's name and one line
 * about it), each row pushing a detail screen that ends in a single "Start a conversation" button.
 * Every word comes from content/services.ts and content/philosophy.ts.
 */

/** Opens Contact with the subject filled in (or empty, from the list's own Contact row). */
function contact(subject = "") {
  useOS.getState().setContactSubject(subject);
  openApp("contact");
}

function ServiceDetail({ service: s }: { service: Service }) {
  return (
    <AppScreen>
      <AppHeader title={s.title} backLabel="Back to Services" subtitle={s.summary} />

      <Section header="What you get" inset={16}>
        {s.points.map((p) => (
          <Row key={p} title={p} />
        ))}
      </Section>

      <Section header="Good for" inset={16}>
        <Row title={s.goodFor} />
      </Section>

      {s.tools && (
        <Section header={s.tools.label} inset={16}>
          {s.tools.items.map((t) => (
            <Row key={t} title={t} />
          ))}
        </Section>
      )}

      {s.id === "courses" && (
        <>
          <Section header="How I teach" inset={16}>
            {philosophy.map((p) => (
              <Row key={p.quote} title={p.quote} />
            ))}
          </Section>
          <Section inset={16} label="More">
            <Row title="Browse courses" onPush={() => openApp("courses")} data={{ "data-service-courses": "" }} />
          </Section>
        </>
      )}

      <ProminentButton
        onClick={() => contact(s.title)}
        label={`Start a conversation about ${s.title}`}
        data={{ "data-start-conversation": "" }}
      >
        Start a conversation
      </ProminentButton>
    </AppScreen>
  );
}

export default function ServicesApp() {
  const sub = useOS((s) => (s.route.app === "services" ? s.route.sub : null));
  const shown = useLastValue(sub);
  const detail = services.find((s) => s.id === shown);

  return (
    <>
      <AppScreen>
        <AppHeader title={servicesTitle} subtitle={servicesIntro} />

        <Section label="Services" footer={servicesFooter}>
          {services.map((s) => (
            <Row
              key={s.id}
              leading={<ServiceTile id={s.id} />}
              title={s.title}
              secondary={s.summary}
              onPush={() => openApp("services", s.id)}
              data={{ "data-service-row": s.id }}
            />
          ))}
        </Section>

        <Section inset={16} label="Contact">
          <Row title="Contact me" onAction={() => contact()} data={{ "data-contact-row": "" }} />
        </Section>
      </AppScreen>

      <PushView open={!!sub && !!services.find((s) => s.id === sub)} label="Service details">
        {detail && <ServiceDetail service={detail} />}
      </PushView>
    </>
  );
}
