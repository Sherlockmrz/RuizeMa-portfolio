import type { Metadata } from "next";
import { Award, Code2, ExternalLink, GitBranch, Globe2, MessageCircle } from "lucide-react";

import { ToolCard } from "@/components/ToolCard";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Ruize Ma, Ruize Lab, and the AI Systems Lab focus behind the site.",
};

const coreCourses = [
  "LLM",
  "Responsible DS",
  "Machine Learning",
  "CS",
  "Data Structures",
  "Discrete Mathematics",
  "Calculus III",
];

const researchExperience = [
  {
    title:
      "Plan–Act–Verify: An Agentic AI Question Answering and Reasoning System Evaluated on the CURE-Bench Challenge",
    date: "07/2025 – 10/2025",
    role: "First Author, MIDI 2025",
    tags: ["First Author", "MIDI 2025", "LLM Agent", "Biomedical AI"],
    description:
      "Served as team lead and first author on a clinical AI project developing an evidence-grounded LLM agent for therapeutic decision support, with a plan-act-verify architecture designed to improve reliability, reduce hallucination risk, and support auditable medical reasoning.",
    bullets: [
      "Integrated a curated biomedical tool stack spanning FDA labels, DailyMed, MedlinePlus, RxNav/RxNorm, OpenTargets, and PubChem, enabling the system to retrieve up-to-date drug evidence instead of relying solely on parametric model memory.",
      "Built an evidence-grounding workflow that distilled retrieved information into concise, source-attributed “Tool Facts”, improving transparency and making final multiple-choice decisions more auditable for clinical use.",
      "Achieved 0.69564 accuracy on the hidden test set of the NeurIPS CURE-Bench agentic reasoning challenge after fine-tuning and tool integration, demonstrating strong performance on therapeutic reasoning tasks.",
      "Addressed medically important reasoning problems in drug decision-making and precision therapeutics, including evidence-grounded treatment selection, medication safety reasoning, dosing-related questions, contraindications, and monitoring logic in a benchmark designed for high-stakes clinical applications.",
    ],
    links: [
      {
        label: "Conference abstract PDF",
        href: "https://midi2025.opi.org.pl/wp-content/uploads/2025/12/Plan-Act-Verify-An-Agentic-AI-Question-Answering-and-Reasoning-System-Evaluated-on-the-CURE-Bench-Challenge.pdf",
      },
      {
        label: "MIDI 2025 virtual venue",
        href: "https://midi2025.opi.org.pl/vr-venue/",
      },
    ],
  },
  {
    title:
      "Reliability Beyond Accuracy: Error Analysis of Agentic Tool-Augmented Reasoning in LLMs on CURE-Bench",
    date: "10/2025 – 11/2025",
    role: "Second Author, Accepted at FLAIRS-39",
    tags: ["FLAIRS-39", "Biomedical AI", "LLM Agent"],
    description:
      "Co-authored a reliability-focused study of agentic clinical reasoning systems, analyzing failure modes that remain hidden when evaluation relies on accuracy alone.",
    bullets: [
      "Audited 2,079 benchmark questions and 347,125 tool calls, uncovering large-scale operational weaknesses in tool-augmented LLM pipelines for therapeutic reasoning.",
      "Identified 342,515 missing-parameter tool failures, accounting for more than 99% of all failures, and showed that tool integration can appear active while still failing to retrieve usable medical evidence at scale.",
      "Discovered severe instability in repeated questions, with 154 of 155 duplicated stems receiving different answer letters, revealing a major reproducibility problem for healthcare AI systems.",
      "Translated empirical findings into a practical deployment audit checklist for healthcare AI, covering tool contract validation, evidence logging, invariance testing, and option-formatting stress tests.",
    ],
    links: [
      {
        label: "Accepted papers page",
        href: "https://www.flairs-39.info/accepted-papers",
      },
    ],
  },
  {
    title: "Medical Insurance Cost Predictor",
    subtitle: "Machine Learning + Web App Project",
    date: "02/2026 – 05/2025",
    tags: ["Machine Learning", "Web App", "Predictive Modeling"],
    description:
      "Developed and contributed to a medical insurance cost prediction system combining neural networks, quantile regression, uncertainty-aware prediction, and web-based analytics.",
    bullets: [
      "Developed a PyTorch MLP regressor and quantile regression module for a medical insurance cost prediction system, enabling both point estimates and uncertainty-aware prediction intervals for annual charges.",
      "Built the front-end analytics layer in Streamlit, creating an interactive model comparison page that combined machine learning outputs, uncertainty estimates, and accessible visual reporting for non-technical users.",
      "Contributed to a broader machine learning pipeline comparing Linear Regression, Random Forest, XGBoost, MLP, and mixture-based modeling for a strongly bimodal healthcare cost distribution shaped by smoking status.",
      "Helped build an interpretable health-finance application that lets users input demographic and health features and receive data-driven insurance charge estimates, connecting ML modeling with practical product design.",
    ],
  },
  {
    title: "LLM-Driven NBA Roster Upgrade Agent",
    date: "02/2025 – 05/2025",
    tags: ["LLM Agent", "Sports Analytics", "Predictive Modeling"],
    description:
      "Built an LLM-driven sports analytics agent that converts natural-language roster requests into structured constraints and automatically orchestrates modular analysis tools for team-need diagnosis, player filtering, ranking, and report generation.",
    bullets: [
      "Designed an interpretable team weakness diagnosis module using rolling-window statistics, league-wide Z-score normalization, and Ridge Regression coefficients to quantify which performance deficits matter most for winning.",
      "Constructed standardized PlayerVectors from box-score and advanced statistics, then ranked candidates through a weighted Fit Score that matched player strengths to team-specific needs.",
      "Automated the generation of explainable scouting reports and visual summaries, including team-need charts and player radar plots, making statistical recommendations easier to interpret for non-technical decision makers.",
      "According to the project demo, a query about improving the Warriors’ interior defense filtered the pool to 236 players and ranked Anthony Davis as the top fit under the stated constraints.",
      "Extended the system toward real-world front-office use by planning support for salary constraints, age filters, positional normalization, trade feasibility, and recommendation stability analysis.",
    ],
  },
  {
    title:
      "Statistical Analysis and Predictive Modeling on Professor Ratings Using RateMyProfessor Dataset",
    date: "03/2025 – 05/2025",
    tags: ["Machine Learning", "Predictive Modeling"],
    description:
      "Built a statistical and predictive modeling project using RateMyProfessor data to analyze rating patterns, gender bias, difficulty-rating relationships, and prediction models.",
    bullets: [
      "Cleaned and preprocessed a large-scale dataset from RateMyProfessor by setting an empirical threshold to exclude biased entries, improving the reliability of statistical comparisons across gender, experience level, and teaching mode.",
      "Conducted hypothesis-driven analyses using Welch’s t-test, Mann-Whitney U test, and Pearson correlation to identify significant rating patterns, such as pro-male gender bias and the inverse correlation between course difficulty and professor rating, r ≈ –0.74.",
      "Developed linear regression and Ridge regression models to predict professor ratings, achieving an R² of 0.81 and RMSE of 0.37, demonstrating that combining multiple features significantly improves prediction accuracy.",
      "Built logistic regression classifiers with L2 regularization and class stratification to predict professor “hotness” / pepper status, increasing AUROC from 0.79 to 0.807 with multi-feature integration, showing improved model robustness.",
    ],
  },
  {
    title: "Rental Price Estimation with Machine Learning",
    date: "06/2024 – 08/2024",
    role: "Team leader",
    tags: ["Machine Learning", "Predictive Modeling"],
    description:
      "Built a rental price prediction project using machine learning models and housing datasets.",
    bullets: [
      "Built a house rent prediction model using multiple regression algorithms including Linear Regression and Random Forest, leveraging features such as location, size, and furnishing status to optimize model performance.",
      "Processed and cleaned raw housing datasets with Pandas and NumPy, handling missing values and categorical variables through encoding and scaling, ensuring data quality for model training.",
      "Visualized feature distributions and correlations using Seaborn and Matplotlib to uncover key drivers of rental prices, enhancing model interpretability and stakeholder insights.",
      "Achieved a model accuracy of over 85% on test data through hyperparameter tuning and model evaluation using R² and RMSE metrics, demonstrating robust predictive capabilities.",
    ],
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)] lg:items-start">
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur sm:p-7">
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-start lg:grid-cols-[minmax(0,1fr)_260px]">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
                  about
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Ruize Ma
                </h1>
              </div>

              <div className="w-full max-w-[260px] justify-self-start rounded-2xl border border-violet-300/20 bg-violet-400/[0.07] p-3 shadow-[0_18px_70px_rgba(167,139,250,0.12)] sm:justify-self-end">
                <div className="aspect-square rounded-xl border border-white/[0.1] bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.32),rgba(17,19,31,0.76)_50%,rgba(0,0,0,0.22))] p-3">
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-black/20 text-center">
                    <p className="font-mono text-6xl font-semibold text-white">RM</p>
                    <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-violet-200/70">
                      photo placeholder
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-8 max-w-4xl text-base leading-8 text-zinc-300 sm:mt-10">
              Data Science/Math student at New York University building LLM
              agents and data-driven applications. Interested in AI for
              decision-making, reasoning, and real-world impacts.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ContactCard
              icon={<MessageCircle className="size-4" />}
              label="WECHAT"
              value="Marvin041018"
            />
            <ContactCard
              icon={<GitBranch className="size-4" />}
              label="GITHUB"
              value="Sherlockmrz"
              href="https://github.com/Sherlockmrz"
            />
            <ContactCard
              icon={<Globe2 className="size-4" />}
              label="UNIVERSITY"
              value="New York University"
            />
            <ContactCard
              icon={<Award className="size-4" />}
              label="MAJOR"
              value="Mathematics and Data Science"
            />
          </div>
        </div>

        <div className="grid gap-4">
          <InfoPanel
            icon={<Globe2 className="size-4" />}
            label="IDENTITY"
            value="Ruize Lab"
          >
            <p className="mt-3 text-sm leading-6 text-zinc-400">AI Systems Lab</p>
          </InfoPanel>

          <InfoPanel icon={<Code2 className="size-4" />} label="CORE COURSE">
            <div className="mt-4 flex flex-wrap gap-2">
              {coreCourses.map((course) => (
                <span
                  key={course}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-zinc-300"
                >
                  {course}
                </span>
              ))}
            </div>
          </InfoPanel>

          <InfoPanel
            icon={<Award className="size-4" />}
            label="TOEFL"
            value="112/120"
          >
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Programming Skills: Java, Python, SQL, R
            </p>
          </InfoPanel>

          <InfoPanel
            icon={<Code2 className="size-4" />}
            label="DELIVERY"
            value="fullstack"
          >
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Next.js frontend + FastAPI backend
            </p>
          </InfoPanel>
        </div>
      </section>

      <section className="mt-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
              working style
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Product clarity for technical systems
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {projects.map((project) => (
            <ToolCard key={project.slug} tool={project.tools[0]} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200/70">
            research experience
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Research Experience
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Clinical AI, reliability auditing, sports analytics, and predictive
            modeling projects with emphasis on transparent workflows and usable
            decision support.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          {researchExperience.map((item, index) => (
            <ResearchCard key={item.title} item={item} index={index} />
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.28)] backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
          stack
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Next.js App Router", "TypeScript", "Tailwind CSS", "Framer Motion", "lucide-react"].map(
            (item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-zinc-300"
              >
                {item}
              </span>
            ),
          )}
        </div>
      </section>
    </main>
  );
}

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-violet-300/20">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] text-violet-200">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-zinc-100">{value}</p>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}

function InfoPanel({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] text-violet-200">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          {value ? <p className="mt-2 text-2xl font-semibold text-white">{value}</p> : null}
        </div>
      </div>
      {children}
    </article>
  );
}

function ResearchCard({
  item,
  index,
}: {
  item: {
    title: string;
    subtitle?: string;
    date: string;
    role?: string;
    tags: string[];
    description: string;
    bullets: string[];
    links?: Array<{ label: string; href: string }>;
  };
  index: number;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#11131F]/75 p-5 shadow-[0_24px_100px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-300/70 via-cyan-300/40 to-transparent" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-violet-300/20 bg-violet-400/[0.08] font-mono text-xs text-violet-100">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs text-zinc-400">
              {item.date}
            </span>
            {item.role ? <Badge>{item.role}</Badge> : null}
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
            {item.title}
          </h3>
          {item.subtitle ? (
            <p className="mt-2 text-sm font-medium text-violet-100">{item.subtitle}</p>
          ) : null}
        </div>

        <div className="flex max-w-xl flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-zinc-300">{item.description}</p>

      <ul className="mt-5 grid gap-3 text-sm leading-6 text-zinc-400">
        {item.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-300/80" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {item.links?.length ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {item.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-sm font-semibold text-zinc-100 transition hover:border-violet-300/30 hover:bg-white/[0.07]"
            >
              {link.label}
              <ExternalLink className="size-3.5" />
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1 font-mono text-xs text-violet-100">
      {children}
    </span>
  );
}
