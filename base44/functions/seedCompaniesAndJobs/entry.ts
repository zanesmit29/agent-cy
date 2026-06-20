import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const companiesData = [
      { name: "Weaviate", contact_email: "hiring@weaviate.io", contact_name: "Laura van den Berg", website: "https://weaviate.io", industry: "AI Infrastructure", company_size: "51–200" },
      { name: "LangChain", contact_email: "hiring@langchain.com", contact_name: "James Morley", website: "https://langchain.com", industry: "AI Developer Tools", company_size: "11–50" },
      { name: "Qdrant", contact_email: "hiring@qdrant.tech", contact_name: "Anna Müller", website: "https://qdrant.tech", industry: "AI Infrastructure", company_size: "11–50" },
      { name: "Cohere", contact_email: "hiring@cohere.com", contact_name: "Sophie Martin", website: "https://cohere.com", industry: "AI / NLP", company_size: "51–200" },
      { name: "Hugging Face", contact_email: "hiring@huggingface.co", contact_name: "Thomas Dubois", website: "https://huggingface.co", industry: "AI / Open Source", company_size: "51–200" },
    ];

    const createdCompanies = {};
    for (const company of companiesData) {
      const created = await base44.asServiceRole.entities.Company.create(company);
      createdCompanies[company.name] = created.id;
    }

    const jobsData = [
      {
        title: "Senior ML Engineer — Vector Search",
        company: createdCompanies["Weaviate"],
        status: "Open", role_type: "AI/ML",
        required_stack: "Python, PyTorch, Weaviate, REST APIs, Docker",
        description: "Work on the core vector search engine — improving indexing performance, building new distance metrics, and integrating with LLM pipelines.",
        conversational_description: "We're hiring a Senior ML Engineer to work on Weaviate's core vector search engine — indexing performance and LLM pipeline integrations.",
        salary_range: "€90k–€120k", location: "Amsterdam", work_type: "Hybrid", open_slots: 2, suggested_outreach_mode: "Light",
      },
      {
        title: "AI/ML Engineer — RAG Pipelines",
        company: createdCompanies["Weaviate"],
        status: "Open", role_type: "AI/ML",
        required_stack: "Python, LangChain, Weaviate, OpenAI API, FastAPI",
        description: "Build and maintain production RAG pipelines for enterprise customers. Own the retrieval layer — chunking, embedding models, re-ranking.",
        conversational_description: "We're looking for an AI/ML Engineer to build production RAG pipelines at Weaviate, working directly with enterprise customers.",
        salary_range: "€80k–€105k", location: "Amsterdam", work_type: "Hybrid", open_slots: 1, suggested_outreach_mode: "Light",
      },
      {
        title: "Developer Advocate — LangChain Ecosystem",
        company: createdCompanies["LangChain"],
        status: "Open", role_type: "Fullstack",
        required_stack: "Python, LangChain, LangGraph, technical writing, public speaking",
        description: "Be the face of LangChain to the developer community. Build demos, write tutorials, speak at conferences.",
        conversational_description: "LangChain is hiring a Developer Advocate to build demos, write tutorials, and represent the ecosystem to developers worldwide.",
        salary_range: "€75k–€95k", location: "Remote (EU)", work_type: "Remote", open_slots: 1, suggested_outreach_mode: "Passive",
      },
      {
        title: "Rust Engineer — Vector Database Core",
        company: createdCompanies["Qdrant"],
        status: "Open", role_type: "Backend",
        required_stack: "Rust, distributed systems, vector search, gRPC",
        description: "Work on Qdrant's open-source vector database core — HNSW indexing, SIMD optimisations, and distributed consistency.",
        conversational_description: "Qdrant is hiring a Rust Engineer to work on performance-critical vector database core — indexing and distributed systems.",
        salary_range: "€85k–€115k", location: "Remote (EU)", work_type: "Remote", open_slots: 2, suggested_outreach_mode: "Light",
      },
      {
        title: "ML Research Engineer — Embeddings",
        company: createdCompanies["Cohere"],
        status: "Open", role_type: "AI/ML",
        required_stack: "Python, PyTorch, transformers, multilingual NLP, MTEB benchmarks",
        description: "Research and ship improvements to Cohere's embedding models. Design experiments, run MTEB evals, push quality in multilingual settings.",
        conversational_description: "Cohere is hiring an ML Research Engineer to improve embedding models — evals, experiments, and shipping to production.",
        salary_range: "€95k–€130k", location: "Amsterdam", work_type: "Hybrid", open_slots: 1, suggested_outreach_mode: "Passive",
      },
      {
        title: "Open Source ML Engineer — Inference",
        company: createdCompanies["Hugging Face"],
        status: "Open", role_type: "AI/ML",
        required_stack: "Python, PyTorch, TGI, vLLM, CUDA, model quantisation",
        description: "Work on Hugging Face's inference stack — TGI, model quantisation, and serving optimisations used by millions of developers.",
        conversational_description: "Hugging Face is hiring an ML Engineer to work on their open-source inference stack — TGI, quantisation, and serving performance.",
        salary_range: "€90k–€125k", location: "Remote (EU)", work_type: "Remote", open_slots: 2, suggested_outreach_mode: "Light",
      },
    ];

    const createdJobs = [];
    for (const job of jobsData) {
      const created = await base44.asServiceRole.entities.Job.create(job);
      createdJobs.push({ id: created.id, title: job.title });
    }

    return Response.json({
      success: true,
      companies_created: Object.entries(createdCompanies).map(([name, id]) => ({ name, id })),
      jobs_created: createdJobs.length,
      jobs: createdJobs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});