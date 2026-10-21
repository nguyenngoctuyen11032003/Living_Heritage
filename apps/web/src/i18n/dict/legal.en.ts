import type { Shape } from '../types';
import type vi from './legal.vi';

export default {
  _ns: 'legal',
  common: {
    draft: 'Draft for the pilot phase',
    updated: 'Updated October 21, 2026',
    toc: 'On this page',
    pilotNote: 'Living Heritage is in its pilot phase. This page may change before full launch; we will announce any significant change in advance.',
    related: 'See also',
    signUp: 'Create a free account',
  },
  how: {
    title: 'How it works',
    eyebrow: 'From a spoken story to a legacy',
    heading: 'Grandparents just talk. We do the rest together with the family.',
    lead: 'Living Heritage breaks the journey into four clear steps. At every step you know who is doing what, where the data is, and what comes next.',
    steps: {
      s1: {
        title: 'Tell it out loud',
        body: 'The family creates a storytelling link for their grandparent. Opening it on a phone goes straight into storytelling mode — no password needed.',
        a: 'Pick one of six topics, or “Not sure what to tell” for a gentle prompt.',
        b: 'Hear the question read aloud and press one big button to record; pause and carry on anytime.',
        c: 'Listen back, then choose Keep, Record again or move on to the next question.',
      },
      s2: {
        title: 'AI drafts',
        body: 'The recording goes to our server, where AI transcribes the Vietnamese and prepares a draft. The browser never holds an AI key.',
        a: 'The transcript keeps the way they speak; anything unclear is flagged “Needs checking”.',
        b: 'AI suggests a story that reads well, or a structured know-how card.',
        c: 'If processing fails, the original recording is kept and you can try again.',
      },
      s3: {
        title: 'The storyteller approves',
        body: 'A draft is only a draft. The storyteller — or a grandchild sitting alongside — reads it back and fixes names, places and dates.',
        a: 'Transcript and draft sit side by side for easy comparison.',
        b: 'Only the storyteller can tap “Yes, this is what I meant”.',
        c: 'Every edit creates a new version; editing after approval means approving again.',
      },
      s4: {
        title: 'Keep and share',
        body: 'Approved versions go into the family vault, private by default. From there the family decides how far to share.',
        a: 'Invite relatives with the right role.',
        b: 'Propose individual know-how cards for the public knowledge hub, subject to review.',
        c: 'Choose chapters for a memory book with QR codes back to the original voice.',
      },
    },
    rolesTitle: 'Who does what',
    roles: {
      people: { title: 'People decide', body: 'Choosing topics, telling, correcting, approving, sharing, withdrawing, deleting — all of it is up to the storyteller and the family.' },
      ai: { title: 'AI does the heavy lifting', body: 'Transcribing, suggesting a layout, filling in the fields of a know-how card. AI never saves or publishes anything on its own.' },
    },
  },
  plans: {
    title: 'Plans',
    eyebrow: 'Clear about cost',
    heading: 'Free during the pilot',
    lead: 'We publish planned prices up front so families have the full picture. Right now we charge nothing, take no payments and renew nothing automatically.',
    notesTitle: 'Good to know about pricing',
    notes: {
      a: 'All prices are planned and may change after the pilot.',
      b: 'When official plans launch, you’ll be told in advance and choose whether to join.',
      c: 'Everything you create during the pilot still belongs to your family.',
      d: 'Printed books are planned; the print-at-home PDF comes first.',
    },
  },
  orgs: {
    title: 'For organizations',
    eyebrow: 'Community programs',
    heading: 'Record your community’s memories and know-how, together',
    lead: 'Living Heritage can support organizations that want to preserve elders’ stories properly: with a consent process, trained helpers and a shared, reviewed knowledge hub.',
    audiencesTitle: 'A good fit for',
    audiences: {
      library: { title: 'Libraries', body: 'Build a collection of local oral histories, with searchable transcripts.' },
      museum: { title: 'Museums and cultural centers', body: 'Capture the stories around objects, traditional crafts and festivals.' },
      seniors: { title: 'Senior associations', body: 'Host storytelling sessions and help members leave something for their grandchildren.' },
      school: { title: 'Schools', body: '“Interview your grandparents” projects where students learn from real experience.' },
    },
    programTitle: 'A sample program',
    program: {
      s1: { title: 'Understand the need', body: 'Agree on topics, the number of storytellers and how the content will be used.' },
      s2: { title: 'Train the helpers', body: 'Show volunteers how to ask good questions and help storytellers use the tool.' },
      s3: { title: 'Record with consent', body: 'Each storyteller gives clear consent and can review or withdraw their content.' },
      s4: { title: 'Curate the shared hub', body: 'What they allow goes into the knowledge hub, with the source and limits spelled out.' },
    },
    principlesTitle: 'Principles that don’t change',
    principles: {
      a: 'Storytellers keep the rights to their own stories.',
      b: 'Nothing is published without consent and review.',
      c: 'Content is never used to train AI models without permission.',
      d: 'The program is in a pilot phase; there are no official partners yet.',
    },
    contactTitle: 'Interested in piloting with us?',
    contactBody: 'A dedicated intake channel for organizations is being prepared. In the meantime, create an account to try the full journey and hear from us when the program opens.',
  },
  privacy: {
    title: 'Privacy',
    eyebrow: 'Privacy policy',
    heading: 'How we look after your family’s stories',
    lead: 'In plain language: what we store, why, who can see it, and what rights you have.',
    sections: {
      scope: {
        title: 'Scope',
        body: 'This policy covers the Living Heritage website and its features during the pilot phase: storytelling mode, the family vault, the knowledge hub and memory books.',
      },
      data: {
        title: 'What we store',
        body: 'We keep only what the service needs to work:',
        a: 'Account details: email, display name, preferred language.',
        b: 'Family details: members, roles, storytellers and relationships.',
        c: 'Content: recordings, transcripts, drafts, versions and approval status.',
        d: 'Sharing choices and a log of access changes.',
      },
      purpose: {
        title: 'Why we use it',
        body: 'Data is used to transcribe, draft, store for the family, show content that has been approved for sharing, and keep the system secure. We do not sell data and we never use your content for advertising.',
      },
      ai: {
        title: 'How AI handles a recording',
        body: 'Recordings are sent from our server to a third-party AI service (Google Gemini) for transcription and drafting. The AI key lives only on the server. AI output is always a draft and is saved as the storyteller’s words only after they confirm it.',
      },
      access: {
        title: 'Who can see it',
        body: 'By default, content is visible only to invited family members, according to their role. Access is checked on the server for every request; audio lives in private storage and opens only through time-limited links.',
      },
      public: {
        title: 'Public sharing',
        body: 'Content enters the public knowledge hub only when the storyteller agrees, the family submits a request and it passes review. You choose whether to include the voice, real name or hometown, and you can withdraw it at any time. If the content is edited, the public version is taken down automatically until it is approved again.',
      },
      rights: {
        title: 'Your rights',
        body: 'You can:',
        a: 'See and correct your information and content.',
        b: 'Download your family’s data.',
        c: 'Withdraw content from the public hub.',
        d: 'Request deletion of individual items or the whole account, audio included.',
      },
      elders: {
        title: 'Elders and consent',
        body: 'Storytellers decide what happens to their stories. When a storyteller needs help using the tool, a family member can assist, but confirming the content must reflect what the storyteller meant, and that confirmation is recorded.',
      },
      changes: {
        title: 'Changes to this policy',
        body: 'This is a draft for the pilot phase. If anything important changes, we will post a notice on the website before it takes effect.',
      },
    },
  },
  terms: {
    title: 'Terms of use',
    eyebrow: 'Terms of use',
    heading: 'What we agree on when you use Living Heritage',
    lead: 'Short, clear, and with the storyteller’s rights first.',
    sections: {
      pilot: {
        title: 'Pilot phase',
        body: 'The service is in a pilot and may change or pause while we improve it. We work hard to keep data safe, but we encourage families to download copies of anything important.',
      },
      account: {
        title: 'Your account',
        body: 'You are responsible for keeping your account and any storytelling links you create secure. Revoke links you no longer use.',
      },
      content: {
        title: 'Your content is yours',
        body: 'Stories, transcripts and photos belong to the storyteller and their family. You allow us to store and process them only to provide the service, within the scope you choose.',
      },
      consent: {
        title: 'Storyteller consent',
        body: 'Only record and share a story with the storyteller’s consent. Don’t record people without their knowledge, and don’t post private information about third parties.',
      },
      knowledge: {
        title: 'The public knowledge hub',
        body: 'Know-how cards are personal experience, with a named source and stated limits. They are not professional medical, legal, financial or technical advice. Please credit the source when you quote them.',
      },
      ai: {
        title: 'AI and accuracy',
        body: 'AI can mishear or misphrase. That is why every draft needs the storyteller’s approval; we make no guarantee that an unapproved draft is accurate.',
      },
      prohibited: {
        title: 'Not allowed',
        body: 'Don’t use the service to post unlawful, abusive or impersonating content, or anything that infringes other people’s rights, and don’t try to access another family’s data.',
      },
      fees: {
        title: 'Fees',
        body: 'Nothing is charged at the moment. Every price on the website is planned. If paid plans launch, you’ll be told in advance and decide for yourself.',
      },
      ending: {
        title: 'Leaving and deletion',
        body: 'You can stop using the service at any time and ask for your data to be deleted. We may suspend an account that breaches these terms, after giving notice.',
      },
      changes: {
        title: 'Changes to these terms',
        body: 'These terms may be updated as the service grows. Significant changes will be announced before they take effect.',
      },
    },
  },
  book: {
    title: 'Memory books',
    eyebrow: 'Memory books with QR',
    heading: 'Approved stories, bound into a book that speaks',
    lead: 'A memory book is one of the outputs of the storytelling journey: grandchildren read with their eyes and scan a QR code to listen — in their grandparent’s own voice, at the exact passage.',
    stepsTitle: 'Making a book',
    steps: {
      s1: { title: 'Pick approved stories', body: 'Only stories the storyteller has confirmed can go into a book.' },
      s2: { title: 'Arrange chapters and cover', body: 'Drag to order the chapters, choose a cover photo and a dedication.' },
      s3: { title: 'Preview and print to PDF', body: 'Leaf through every page, then print to PDF at home.' },
      s4: { title: 'Order a print (planned)', body: 'Professionally printed hardcovers are planned and not yet available to order.' },
    },
    qrTitle: 'How the QR codes work',
    qrBody: 'Each chapter has a QR code that opens the listening page for that story.',
    qr: {
      a: 'If the story is public, anyone who scans it can listen.',
      b: 'If it’s private to the family, the person scanning must sign in as a member.',
      c: 'Withdraw or delete the story and the QR code stops playing it.',
    },
    ctaTitle: 'It starts with one story',
    ctaBody: 'Every book begins with a single telling. Let your grandparents tell the first story.',
  },
} satisfies Shape<typeof vi>;
