import * as core from '@actions/core'
import * as github from '@actions/github'

const REPO = github.context.repo
const PR_NUMBER = github.context.payload.pull_request?.number as number
const octokit = github.getOctokit(core.getInput('token'))

type Label = {
  name?: string
}

type Review = {
  state?: string
}

async function run(): Promise<void> {
  const can_merge = (await haveMergeLabel()) && (await approved())
  if (can_merge) {
    if (await isSquashPR()) {
      await squashMerge()
    } else if (await isNormalPR()) {
      await merge()
    } else {
      core.info('can not merge without general label.')
    }
  } else {
    core.info('has no merge label or not yet approved.')
  }
}

async function getReviews(): Promise<Review[]> {
  const {data: reviews} = await octokit.rest.pulls.listReviews({
    owner: REPO.owner,
    repo: REPO.repo,
    pull_number: PR_NUMBER
  })
  return reviews
}

async function getPRLabels(): Promise<Label[]> {
  const {data: pr} = await octokit.rest.pulls.get({
    owner: REPO.owner,
    repo: REPO.repo,
    pull_number: PR_NUMBER
  })
  return pr.labels
}

async function approved(): Promise<boolean> {
  const reviews = await getReviews()
  for (const review of reviews) {
    if (review.state?.match(/APPROVED/)) {
      return true
    }
  }
  await postComment('can not merge because not yet approved.')
  return false
}

async function haveMergeLabel(): Promise<boolean> {
  const labels = await getPRLabels()
  for (const label of labels) {
    if (label.name?.match(/merge/)) {
      return true
    }
  }
  return false
}

async function isSquashPR(): Promise<boolean> {
  const labels = await getPRLabels()
  for (const label of labels) {
    if (label.name?.match(/nobunaga|hideyoshi|ieyasu|tsunayoshi/)) {
      return true
    }
  }
  return false
}

async function isNormalPR(): Promise<boolean> {
  const labels = await getPRLabels()
  for (const label of labels) {
    if (label.name?.match(/other/)) {
      return true
    }
  }
  return false
}

async function squashMerge(): Promise<void> {
  octokit.rest.pulls.merge({
    owner: REPO.owner,
    repo: REPO.repo,
    pull_number: PR_NUMBER,
    merge_method: 'squash'
  })
  core.info('squash merge')
}

async function merge(): Promise<void> {
  octokit.rest.pulls.merge({
    owner: REPO.owner,
    repo: REPO.repo,
    pull_number: PR_NUMBER
  })
  core.info('merge')
}

async function postComment(message: string): Promise<void> {
  await octokit.rest.issues.createComment({
    owner: REPO.owner,
    repo: REPO.repo,
    issue_number: PR_NUMBER,
    body: message
  })
}

run()
