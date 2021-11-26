import * as core from '@actions/core'
import * as github from '@actions/github'

const REPO = github.context.repo
const PR_NUMBER = github.context.payload.pull_request?.number as number
const octokit = github.getOctokit(core.getInput('token'))

type Label = {
  name?: string
}

async function run(): Promise<void> {
  const can_merge = await canMerge()
  if (can_merge) {
    if (await isSquashPR()) {
      await squashMerge()
    } else {
      await merge()
    }
  } else {
    core.info('can not merge')
  }
}

async function getPRLabels(): Promise<Label[]> {
  const {data: pr} = await octokit.rest.pulls.get({
    owner: REPO.owner,
    repo: REPO.repo,
    pull_number: PR_NUMBER
  })

  return pr.labels
}

async function canMerge(): Promise<boolean> {
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

run()
