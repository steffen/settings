const BranchProtectionRules = require('../../../../lib/plugins/branchProtectionRules')

describe('BranchProtectionRules', () => {
  let github

  function configure (config) {
    return new BranchProtectionRules(github, { owner: 'steffen', repo: 'test' }, config)
  }

  beforeEach(() => {
    github = {
      repos: {
        get: jest.fn().mockImplementation(() => Promise.resolve()),
        updateBranchProtection: jest.fn().mockImplementation(() => Promise.resolve()),
        removeBranchProtection: jest.fn().mockImplementation(() => Promise.resolve())
      },
      graphql: jest.fn().mockImplementation(() => Promise.resolve())
    }

    github.repos.get.mockReturnValue(Promise.resolve({
      data: { node_id: 'abc' }
    }))
  })

  describe('sync', () => {
    describe('when branch protection rule with the same pattern does not exist', () => {
      it('should add a new branch protection rule', () => {
        const plugin = configure(
          [{
            pattern: 'dev/*',
            requires_approving_reviews: true
          }]
        )

        plugin.find = jest.fn().mockImplementation(() => Promise.resolve([
          { id: 'm', pattern: 'master' }
        ]))

        plugin.add = jest.fn().mockImplementation(() => Promise.resolve())

        return plugin.sync().then((res) => {
          expect(plugin.add).toHaveBeenCalledWith({
            pattern: 'dev/*',
            requires_approving_reviews: true
          })
        })
      })
    })

    describe('when branch protection rule with the same pattern is not configured', () => {
      it('should delete branch protection rule', () => {
        // configured records
        const plugin = configure(
          [{
            pattern: 'dev/*'
          }]
        )

        // existing records
        plugin.find = jest.fn().mockImplementation(() => Promise.resolve([
          { id: 'mas', pattern: 'master' }
        ]))

        plugin.remove = jest.fn().mockImplementation(() => Promise.resolve())

        return plugin.sync().then((res) => {
          expect(plugin.remove).toHaveBeenCalledWith({ id: 'mas', pattern: 'master' })
        })
      })
    })
  })

  describe('find', () => {
    it('should find branch protection rules for repository', () => {
      const plugin = configure()

      github.graphql.mockReturnValueOnce(Promise.resolve({
        repository: { branchProtectionRules: { node: [] } }
      }))

      return plugin.find().then(() => {
        expect(github.graphql).toHaveBeenCalledWith(BranchProtectionRules.listBranchProtectionRules, {
          repositoryName: 'test',
          repositoryOwner: 'steffen'
        })
      })
    })
  })

  describe('add', () => {
    it('should add branch protection rule', () => {
      const plugin = configure()

      plugin.repositoryId = 'abc'

      return plugin.add({
        pattern: 'dev/*',
        requires_approving_reviews: true
      }).then(() => {
        expect(github.graphql).toHaveBeenCalledWith(BranchProtectionRules.createBranchProtectionRule, {
          input: {
            repositoryId: 'abc',
            pattern: 'dev/*',
            requiresApprovingReviews: true
          }
        })
      })
    })
  })

  describe('remove', () => {
    it('should delete branch protection rule', () => {
      const plugin = configure()

      return plugin.remove({
        id: 'del'
      }).then(() => {
        expect(github.graphql).toHaveBeenCalledWith(BranchProtectionRules.deleteBranchProtectionRule, {
          branchProtectionRuleId: 'del'
        })
      })
    })
  })
})
