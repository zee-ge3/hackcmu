export const pythonSolutions = {
  "two-sum": `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, x in enumerate(nums):
            if target-x in seen: return [seen[target-x], i]
            seen[x] = i`,
  "two-sum-ii-input-array-is-sorted": `class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        l, r = 0, len(numbers)-1
        while l < r:
            total = numbers[l]+numbers[r]
            if total == target: return [l+1,r+1]
            if total < target: l += 1
            else: r -= 1`,
  "contains-duplicate": `class Solution:
    def containsDuplicate(self, nums): return len(set(nums)) != len(nums)`,
  "valid-anagram": `class Solution:
    def isAnagram(self, s, t): return sorted(s) == sorted(t)`,
  "valid-parentheses": `class Solution:
    def isValid(self, s):
        stack = []
        pairs = {')':'(', ']':'[', '}':'{'}
        for c in s:
            if c in pairs:
                if not stack or stack.pop() != pairs[c]: return False
            else: stack.append(c)
        return not stack`,
  "binary-search": `class Solution:
    def search(self, nums, target):
        import bisect
        i = bisect.bisect_left(nums,target)
        return i if i < len(nums) and nums[i] == target else -1`,
  "search-insert-position": `class Solution:
    def searchInsert(self, nums, target):
        import bisect
        return bisect.bisect_left(nums,target)`,
  "best-time-to-buy-and-sell-stock": `class Solution:
    def maxProfit(self, prices):
        low, best = float('inf'), 0
        for p in prices:
            low = min(low,p)
            best = max(best,p-low)
        return best`,
  "maximum-subarray": `class Solution:
    def maxSubArray(self, nums):
        best = ending = nums[0]
        for x in nums[1:]:
            ending = max(x,ending+x)
            best = max(best,ending)
        return best`,
  "move-zeroes": `class Solution:
    def moveZeroes(self, nums):
        nonzero = [x for x in nums if x != 0]
        nums[:] = nonzero + [0]*(len(nums)-len(nonzero))`,
  "merge-intervals": `class Solution:
    def merge(self, intervals):
        out = []
        for start,end in sorted(intervals):
            if out and start <= out[-1][1]: out[-1][1] = max(end,out[-1][1])
            else: out.append([start,end])
        return out`,
  "reverse-linked-list": `class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev = None
        while head:
            nxt = head.next
            head.next = prev
            prev, head = head, nxt
        return prev`,
  "maximum-depth-of-binary-tree": `class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        return 0 if root is None else 1+max(self.maxDepth(root.left),self.maxDepth(root.right))`,
  "invert-binary-tree": `class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if root:
            root.left,root.right = self.invertTree(root.right),self.invertTree(root.left)
        return root`,
  "3sum": `class Solution:
    def threeSum(self, nums):
        nums.sort()
        out = []
        for i in range(len(nums)-2):
            if i and nums[i] == nums[i-1]: continue
            l,r = i+1,len(nums)-1
            while l<r:
                total=nums[i]+nums[l]+nums[r]
                if total==0:
                    out.append([nums[i],nums[l],nums[r]])
                    left,right=nums[l],nums[r]
                    while l<r and nums[l]==left: l+=1
                    while l<r and nums[r]==right: r-=1
                elif total<0: l+=1
                else: r-=1
        return out`,
};
