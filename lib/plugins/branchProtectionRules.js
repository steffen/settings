const Diffable = require('./diffable')

module.exports = class BranchProtectionRules extends Diffable {
  // https://developer.github.com/v4/object/branchprotectionruleconnection/
  static listBranchProtectionRules = `
    query ($repositoryName: String!, $repositoryOwner: String!) {
      repository(name: $repositoryName, owner: $repositoryOwner) {
        id
        branchProtectionRules (first: 100) {
          nodes {
            id
            pattern
          }
        }
      }
    }
  `

  // https://developer.github.com/v4/mutation/createbranchprotectionrule/
  static createBranchProtectionRule = `
    mutation ($input: CreateBranchProtectionRuleInput!) {
      createBranchProtectionRule(input: $input) {
        clientMutationId
      }
    }
  `

  // https://developer.github.com/v4/mutation/deletebranchprotectionrule/
  static deleteBranchProtectionRule = `
    mutation ($branchProtectionRuleId: ID!) {
      deleteBranchProtectionRule(input: { branchProtectionRuleId: $branchProtectionRuleId }) {
        clientMutationId
      }
    }
  `

  constructor (...args) {
    super(...args)
  }

  sync () {
    if (this.entries) {
      return this.github.repos.get(this.repo).then(res => {
        this.repositoryId = res.data.node_id

        return this.find().then(existingRecords => {
          const changes = []

          this.entries.forEach(attrs => {
            const existing = existingRecords.find(record => {
              return this.comparator(record, attrs)
            })

            if (!existing) {
              changes.push(this.add(attrs))
            // } else if (this.changed(existing, attrs)) {
              // changes.push(this.update(existing, attrs))
            }
          })

          existingRecords.forEach(x => {
            if (!this.entries.find(y => this.comparator(x, y))) {
              changes.push(this.remove(x))
            }
          })

          return Promise.all(changes)
        })
      })
    }
  }

  find () {
    return this.github.graphql(this.constructor.listBranchProtectionRules, {
      repositoryName: this.repo.repo,
      repositoryOwner: this.repo.owner
    }).then(res => {
      return res.repository.branchProtectionRules.nodes
    })
  }

  comparator (existing, attrs) {
    return existing.pattern === attrs.pattern
  }

  changed (existing, attrs) {
    return existing.permission !== attrs.permission
  }

  update (existing, attrs) {
    return this.add(attrs)
  }

  add (attrs) {
    return this.github.graphql(this.constructor.createBranchProtectionRule, {
      // mapping fields for https://developer.github.com/v4/input_object/createbranchprotectionruleinput/
      input: {
        repositoryId: this.repositoryId,
        pattern: attrs.pattern,
        requiresApprovingReviews: attrs.requires_approving_reviews
      }
    })
  }

  remove (existing) {
    return this.github.graphql(this.constructor.deleteBranchProtectionRule, {
      branchProtectionRuleId: existing.id
    })
  }
}
