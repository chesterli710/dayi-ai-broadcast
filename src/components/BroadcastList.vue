<template>
  <div class="broadcast-list">
    <div class="list-header">
      <h2>导播列表</h2>
      <el-button type="primary" @click="handleCreate">
        <el-icon><plus /></el-icon>
        新建导播
      </el-button>
    </div>
    
    <el-table
      v-loading="loading"
      :data="broadcastList"
      border
      style="width: 100%"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" min-width="150" />
      <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="180" />
      <el-table-column prop="duration" label="时长(秒)" width="100" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button size="small" type="primary" @click="handleView(row)">查看</el-button>
            <el-button size="small" type="success" @click="handleStart(row)" :disabled="row.status === 'processing'">开始</el-button>
            <el-button size="small" type="danger" @click="handleStop(row)" :disabled="row.status !== 'processing'">停止</el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
    
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
    
    <!-- 创建导播对话框 -->
    <el-dialog v-model="dialogVisible" title="新建导播" width="500px">
      <el-form :model="form" label-width="80px" :rules="rules" ref="formRef">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入导播标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            placeholder="请输入导播内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { broadcastApi } from '../api'
import type { BroadcastItem } from '../mock/broadcast'

export default defineComponent({
  name: 'BroadcastList',
  components: {
    Plus
  },
  setup() {
    // 列表数据
    const broadcastList = ref<BroadcastItem[]>([])
    const loading = ref(false)
    const total = ref(0)
    const currentPage = ref(1)
    const pageSize = ref(10)
    
    // 表单数据
    const dialogVisible = ref(false)
    const submitting = ref(false)
    const formRef = ref<FormInstance>()
    const form = reactive({
      title: '',
      content: ''
    })
    
    // 表单验证规则
    const rules = {
      title: [
        { required: true, message: '请输入导播标题', trigger: 'blur' },
        { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
      ],
      content: [
        { required: true, message: '请输入导播内容', trigger: 'blur' },
        { min: 5, max: 500, message: '长度在 5 到 500 个字符', trigger: 'blur' }
      ]
    }
    
    // 获取列表数据
    const fetchData = async () => {
      loading.value = true
      try {
        const res = await broadcastApi.getList({
          page: currentPage.value,
          pageSize: pageSize.value
        })
        broadcastList.value = res.data.list
        total.value = res.data.total
      } catch (error) {
        console.error('获取导播列表失败', error)
        ElMessage.error('获取导播列表失败')
      } finally {
        loading.value = false
      }
    }
    
    // 获取状态类型
    const getStatusType = (status: string) => {
      switch (status) {
        case 'pending':
          return 'info'
        case 'processing':
          return 'success'
        case 'completed':
          return 'primary'
        case 'failed':
          return 'danger'
        default:
          return 'info'
      }
    }
    
    // 获取状态文本
    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending':
          return '待处理'
        case 'processing':
          return '进行中'
        case 'completed':
          return '已完成'
        case 'failed':
          return '失败'
        default:
          return '未知'
      }
    }
    
    // 处理分页大小变化
    const handleSizeChange = (val: number) => {
      pageSize.value = val
      fetchData()
    }
    
    // 处理页码变化
    const handleCurrentChange = (val: number) => {
      currentPage.value = val
      fetchData()
    }
    
    // 处理查看
    const handleView = (row: BroadcastItem) => {
      ElMessageBox.alert(row.content, row.title, {
        confirmButtonText: '确定'
      })
    }
    
    // 处理开始
    const handleStart = async (row: BroadcastItem) => {
      try {
        await broadcastApi.start(row.id)
        ElMessage.success('开始导播成功')
        fetchData()
      } catch (error) {
        console.error('开始导播失败', error)
        ElMessage.error('开始导播失败')
      }
    }
    
    // 处理停止
    const handleStop = async (row: BroadcastItem) => {
      try {
        await broadcastApi.stop(row.id)
        ElMessage.success('停止导播成功')
        fetchData()
      } catch (error) {
        console.error('停止导播失败', error)
        ElMessage.error('停止导播失败')
      }
    }
    
    // 处理创建
    const handleCreate = () => {
      form.title = ''
      form.content = ''
      dialogVisible.value = true
    }
    
    // 提交表单
    const submitForm = async () => {
      if (!formRef.value) return
      
      await formRef.value.validate(async (valid) => {
        if (valid) {
          submitting.value = true
          try {
            await broadcastApi.create({
              title: form.title,
              content: form.content
            })
            ElMessage.success('创建导播成功')
            dialogVisible.value = false
            fetchData()
          } catch (error) {
            console.error('创建导播失败', error)
            ElMessage.error('创建导播失败')
          } finally {
            submitting.value = false
          }
        }
      })
    }
    
    // 组件挂载时获取数据
    onMounted(() => {
      fetchData()
    })
    
    return {
      broadcastList,
      loading,
      total,
      currentPage,
      pageSize,
      dialogVisible,
      submitting,
      formRef,
      form,
      rules,
      getStatusType,
      getStatusText,
      handleSizeChange,
      handleCurrentChange,
      handleView,
      handleStart,
      handleStop,
      handleCreate,
      submitForm
    }
  }
})
</script>

<style scoped>
.broadcast-list {
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 