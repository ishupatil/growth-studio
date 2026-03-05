import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
from typing import Optional

load_dotenv()

# Initialize Groq LLM
def get_llm():
    return LLM(
        model="groq/llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7,
    )

def run_growth_crew(data: dict, feedback_data: dict = None) -> dict:
    llm = get_llm()

    username = data["username"]
    followers = data["followers"]
    avg_likes = data["avg_likes"]
    avg_comments = data["avg_comments"]
    posting_frequency = data["posting_frequency"]
    content_type = data["content_type"]
    brand_tone = data["brand_tone"]
    goal = data["goal"]
    target_followers = data["target_followers"]
    competitor_username = data.get("competitor_username", "").strip()

    engagement_rate = round(((avg_likes + avg_comments) / followers) * 100, 2)

    profile_context = f"""
    Username: @{username}
    Followers: {followers:,}
    Average Likes per Post: {avg_likes}
    Average Comments per Post: {avg_comments}
    Posts per Week: {posting_frequency}
    Content Type: {content_type}
    Brand Tone: {brand_tone}
    Primary Goal: {goal}
    Target Followers in 30 Days: {target_followers:,}
    Calculated Engagement Rate: {engagement_rate}%
    """

    feedback_context = ""
    if feedback_data:
        caption_feedback = ""
        if feedback_data.get("caption_style_used") and feedback_data.get("caption_result"):
            result_word = "performed well" if feedback_data["caption_result"] == "worked" else "flopped"
            caption_feedback = f"\n    Caption Style That {result_word.title()}: {feedback_data['caption_style_used']}"
        feedback_context = f"""
    [PERFORMANCE FEEDBACK FROM LAST WEEK]
    Followers Gained: {feedback_data.get('followers_gained', 'N/A')}
    Best Performing Post: {feedback_data.get('best_post', 'N/A')}
    Engagement Change: {feedback_data.get('engagement_change', 'N/A')}{caption_feedback}
    
    CRITICAL INSTRUCTION FOR THIS WEEK'S STRATEGY: 
    Adapt your new 7-day strategy to this feedback. Double down on what worked in the "Best Performing Post". 
    Make adjustments based on the engagement changes. If a caption style is noted above, the copywriter MUST 
    prioritize that style (or avoid it if it flopped).
    """


    # ─────────────────────────────────────────
    # COMPETITOR CONTEXT (if provided)
    # ─────────────────────────────────────────
    competitor_context = ""
    if competitor_username:
        competitor_context = f"""
    [COMPETITOR TO ANALYZE: @{competitor_username}]
    The user wants to outgrow this competitor. Reference them in your analysis.
    """

    # ─────────────────────────────────────────
    # AGENT 1 — AUDIT AGENT
    # ─────────────────────────────────────────
    audit_agent = Agent(
        role="Instagram Growth Analyst",
        goal="Analyze Instagram profiles with precision and identify exact growth gaps and opportunities",
        backstory="""You are a seasoned Instagram analytics expert with 10 years of experience 
        auditing accounts for top social media marketing agencies. You are known for your 
        data-driven, brutally honest audits that identify the exact reasons accounts are not growing. 
        You speak in specifics, never generalities.""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    audit_task = Task(
        description=f"""
        Perform a comprehensive Instagram growth audit for this profile:

        {profile_context}

        Your audit must include:
        1. Engagement rate assessment — is {engagement_rate}% good, average, or poor for their niche and follower count?
        2. Top 3 specific weaknesses holding this account back
        3. Top 3 specific growth opportunities based on their content type ({content_type}) and goal ({goal})
        4. An overall assessment in 2-3 sentences

        Be direct, data-driven, and specific. No fluff.

        Format your response EXACTLY like this:
        ENGAGEMENT RATE ASSESSMENT: [your assessment of {engagement_rate}%]
        
        WEAKNESSES:
        1. [specific weakness]
        2. [specific weakness]
        3. [specific weakness]
        
        GROWTH OPPORTUNITIES:
        1. [specific opportunity]
        2. [specific opportunity]
        3. [specific opportunity]
        
        OVERALL ASSESSMENT: [2-3 sentences]
        """,
        agent=audit_agent,
        expected_output="A structured audit report with engagement assessment, 3 weaknesses, 3 opportunities, and overall assessment",
    )

    # ─────────────────────────────────────────
    # AGENT 2 — STRATEGY AGENT
    # ─────────────────────────────────────────
    strategy_agent = Agent(
        role="Social Media Growth Strategist",
        goal="Create actionable, day-by-day 7-day Instagram growth strategies that deliver measurable results",
        backstory="""You are a top-tier social media growth strategist who has helped 500+ creators 
        go from stagnant to viral. You specialize in building hyper-specific, achievable weekly plans 
        tailored to each creator's unique content type and brand voice. Your strategies are known for 
        being realistic yet ambitious — never generic.""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    strategy_task = Task(
        description=f"""
        Based on the audit report provided, create a detailed 7-day Instagram growth strategy.

        Creator Context:
        {profile_context}

        Use the audit findings to inform every day of the plan. The strategy must:
        - Be specific to {content_type} content and a {brand_tone} brand tone
        - Directly address the goal: {goal}
        - Be realistic for someone posting {posting_frequency} times per week
        - Help bridge the gap from {followers:,} to {target_followers:,} followers
        {feedback_context}

        Format your response EXACTLY like this for each day:

        DAY 1 — [Catchy Theme Title]
        Focus: [what this day is about]
        Action: [specific content or posting action]
        Engagement Tactic: [specific way to drive engagement]

        DAY 2 — [Catchy Theme Title]
        Focus: [what this day is about]
        Action: [specific content or posting action]
        Engagement Tactic: [specific way to drive engagement]

        [Continue through DAY 7]
        """,
        agent=strategy_agent,
        expected_output="A 7-day structured growth plan with theme, action, and engagement tactic for each day",
        context=[audit_task],
    )

    # ─────────────────────────────────────────
    # AGENT 3 — CONTENT AGENT
    # ─────────────────────────────────────────
    content_agent = Agent(
        role="Viral Content Strategist",
        goal="Generate scroll-stopping, highly shareable Instagram content concepts perfectly tailored to the creator's niche and voice",
        backstory="""You are a viral content expert who has helped creators rack up millions of views 
        on Instagram. You have an encyclopedic knowledge of what formats, hooks, and angles perform 
        best across every niche. You are obsessed with the first 3 seconds of a reel and the first 
        line of a carousel. Your content ideas are always fresh, never recycled.""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    content_task = Task(
        description=f"""
        Based on the 7-day strategy provided, generate 6 specific, ready-to-execute content ideas.

        Creator Context:
        {profile_context}

        Each idea must be perfectly tailored to:
        - Content format: {content_type}
        - Brand tone: {brand_tone}
        - Goal: {goal}

        IMPORTANT: Include metadata for each idea so creators know what they're committing to.
        Virality Score is based on shareability + hook strength. Difficulty is based on production effort.

        Format your response EXACTLY like this:

        IDEA 1
        Title: [punchy content title]
        Format: [Reel / Carousel / Static Post]
        Hook: [the exact opening line or visual hook — make it irresistible]
        Description: [2 sentences on what this content contains and why it will perform]
        Difficulty: [Easy / Medium / Hard]
        Virality Score: [1 to 5, e.g. 4/5]
        Production Time: [e.g. 30 mins / 2 hours / 4+ hours]
        Best Posted: [e.g. Tuesday 7pm, Weekend morning]

        IDEA 2
        Title: [punchy content title]
        Format: [Reel / Carousel / Static Post]
        Hook: [the exact opening line or visual hook]
        Description: [2 sentences on what this content contains and why it will perform]
        Difficulty: [Easy / Medium / Hard]
        Virality Score: [1 to 5, e.g. 3/5]
        Production Time: [e.g. 1 hour]
        Best Posted: [e.g. Monday 9am]

        [Continue through IDEA 6]
        """,
        agent=content_agent,
        expected_output="6 complete content ideas each with title, format, hook, description, difficulty, virality score, production time, and best posting time",
        context=[strategy_task],
    )

    # ─────────────────────────────────────────
    # AGENT 4 — CAPTION AGENT
    # ─────────────────────────────────────────
    caption_agent = Agent(
        role="Instagram Copywriter & Hashtag Strategist",
        goal="Write captions that stop the scroll, spark conversation, and convert casual viewers into loyal followers",
        backstory="""You are Instagram's most sought-after copywriter. Brands and creators pay premium 
        rates for your captions because they consistently outperform — higher saves, more comments, 
        stronger CTAs. You understand the psychology of social media readers: you know exactly when 
        to use white space, how long captions should be for different goals, and how to build hashtag 
        stacks that maximize reach without looking spammy.""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    caption_task = Task(
        description=f"""
        Write 3 complete, ready-to-post Instagram caption variations based on the content ideas provided.

        Creator Context:
        {profile_context}

        Each caption must match the {brand_tone} brand tone and support the goal: {goal}.
        Each caption should feel completely different in style and structure from the others.
        Include strategic line breaks and white space for readability.

        For each caption also provide:
        - A strong, specific CTA aligned with the goal ({goal})
        - A hashtag cluster of exactly 15 hashtags split into 3 tiers:
          * 5 niche hashtags (under 500K posts — highly targeted)
          * 5 mid hashtags (500K–5M posts — competitive but reachable)
          * 5 broad hashtags (5M+ posts — maximum exposure)

        Format your response EXACTLY like this:

        CAPTION 1
        [Full caption text with line breaks]

        CTA: [specific call to action]

        HASHTAGS:
        Niche: #tag #tag #tag #tag #tag
        Mid: #tag #tag #tag #tag #tag
        Broad: #tag #tag #tag #tag #tag

        ---

        CAPTION 2
        [Full caption text with line breaks]

        CTA: [specific call to action]

        HASHTAGS:
        Niche: #tag #tag #tag #tag #tag
        Mid: #tag #tag #tag #tag #tag
        Broad: #tag #tag #tag #tag #tag

        ---

        CAPTION 3
        [Full caption text with line breaks]

        CTA: [specific call to action]

        HASHTAGS:
        Niche: #tag #tag #tag #tag #tag
        Mid: #tag #tag #tag #tag #tag
        Broad: #tag #tag #tag #tag #tag
        """,
        agent=caption_agent,
        expected_output="3 complete captions each with full text, CTA, and tiered hashtag clusters",
        context=[content_task],
    )

    # ─────────────────────────────────────────
    # AGENT 5 — COMPETITOR ANALYSIS AGENT
    # ─────────────────────────────────────────
    competitor_agent = Agent(
        role="Instagram Competitive Intelligence Analyst",
        goal="Identify exact tactical gaps between the user's account and their competitor, and produce an actionable battle plan",
        backstory="""You are a competitive intelligence expert who has reverse-engineered the growth 
        strategies of 1000+ Instagram accounts. You spot patterns others miss — posting cadence quirks, 
        content angles, engagement bait tactics, and hashtag strategies. Your competitor reports are 
        brutally specific and immediately actionable.""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    competitor_task = Task(
        description=f"""
        Analyze the competitive landscape for @{username} against @{competitor_username if competitor_username else 'a typical creator in their niche'}.

        Creator Context:
        {profile_context}
        {competitor_context if competitor_context else 'No specific competitor provided — analyze typical competitors in this niche.'}

        Your analysis must include:
        1. COMPETITOR STRENGTHS: What is @{competitor_username if competitor_username else 'the typical competitor'} likely doing well? (3 specific tactics)
        2. COMPETITOR WEAKNESSES: Where are they vulnerable? (3 specific gaps the user can exploit)
        3. DIFFERENTIATION STRATEGY: 3 specific ways @{username} can create content that outperforms the competitor
        4. CONTENT ANGLES TO STEAL: 2 proven content angles the competitor uses that @{username} should adapt (not copy)
        5. QUICK WIN: The single fastest move @{username} can make this week to gain ground

        Format EXACTLY like this:

        COMPETITOR STRENGTHS:
        1. [strength]
        2. [strength]
        3. [strength]

        COMPETITOR WEAKNESSES:
        1. [gap]
        2. [gap]
        3. [gap]

        DIFFERENTIATION STRATEGY:
        1. [differentiator]
        2. [differentiator]
        3. [differentiator]

        CONTENT ANGLES TO ADAPT:
        1. [angle]
        2. [angle]

        QUICK WIN: [single best action for this week]
        """,
        agent=competitor_agent,
        expected_output="A structured competitor analysis with strengths, weaknesses, differentiation strategy, content angles, and one quick win",
    )

    # ─────────────────────────────────────────
    # AGENT 6 — SCHEDULER AGENT
    # ─────────────────────────────────────────
    scheduler_agent = Agent(
        role="Social Media Timing & Schedule Strategist",
        goal="Design the perfect 7-day posting schedule with optimal times to maximize reach and engagement for the specific niche and audience",
        backstory="""You are a data-obsessed social media scheduler who has analyzed millions of Instagram 
        posts to identify exactly when different niches get the most engagement. You know that a fitness 
        reel performs best at 6am, a food post peaks at noon, and that posting at the wrong time can 
        kill a great piece of content. Your schedules are precise, practical, and proven.""",
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    scheduler_task = Task(
        description=f"""
        Based on the 7-day strategy provided, create a precise daily posting schedule for @{username}.

        Creator Context:
        {profile_context}

        The schedule must be:
        - Tailored to {content_type} content and a {brand_tone} brand tone
        - Realistic for someone posting {posting_frequency} times per week
        - Based on optimal engagement times for their niche and goal: {goal}

        For each day, provide specific time slots and what type of content to post at each time.
        Also provide reasoning for why those times work for this specific niche.

        Format EXACTLY like this for each day:

        DAY 1 — [Day name e.g. Monday]
        Primary Post Time: [HH:MM AM/PM] — [Content type e.g. Reel, Story, Carousel]
        Secondary Post Time: [HH:MM AM/PM] — [Content type] (if applicable)
        Stories Window: [HH:MM AM/PM]–[HH:MM AM/PM]
        Why These Times: [1 sentence reasoning for this niche]

        DAY 2 — [Day name]
        [Continue pattern...]

        [Continue through DAY 7]

        End with:
        WEEKLY SUMMARY:
        Best Day to Post: [day]
        Best Time Overall: [time]
        Key Insight: [one key timing insight for this niche]
        """,
        agent=scheduler_agent,
        expected_output="A 7-day posting schedule with specific times, content types, and timing rationale",
        context=[strategy_task],
    )

    # ─────────────────────────────────────────
    # ASSEMBLE & RUN THE CREW
    # ─────────────────────────────────────────
    all_agents = [audit_agent, strategy_agent, content_agent, caption_agent, competitor_agent, scheduler_agent]
    all_tasks = [audit_task, strategy_task, content_task, caption_task, competitor_task, scheduler_task]

    crew = Crew(
        agents=all_agents,
        tasks=all_tasks,
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()

    # Extract individual task outputs
    return {
        "audit_report": audit_task.output.raw if audit_task.output else "",
        "strategy_plan": strategy_task.output.raw if strategy_task.output else "",
        "content_ideas": content_task.output.raw if content_task.output else "",
        "captions": caption_task.output.raw if caption_task.output else "",
        "competitor_analysis": competitor_task.output.raw if competitor_task.output else "",
        "posting_schedule": scheduler_task.output.raw if scheduler_task.output else "",
        "engagement_rate": engagement_rate,
    }
