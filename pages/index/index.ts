import { TONE_OPTIONS } from "../../constants/tones";
import { templateService } from "../../services/template";
import { ScenarioTemplate, Tone } from "../../types";
import { showError } from "../../utils/toast";

interface IndexPageData {
  slogan: string;
  description: string;
  templateLoading: boolean;
  templates: ScenarioTemplate[];
  toneOptions: Tone[];
  inputText: string;
  selectedTone: Tone;
  selectedTemplateId: string;
  selectedCategoryLevel1: string;
  selectedCategoryLevel2: string;
}

Page<IndexPageData>({
  data: {
    slogan: "拒绝是你的权利，不必解释太多。",
    description: "帮你把难说的话，体面地说出来。",
    templateLoading: false,
    templates: [],
    toneOptions: TONE_OPTIONS,
    inputText: "",
    selectedTone: "礼貌委婉",
    selectedTemplateId: "",
    selectedCategoryLevel1: "",
    selectedCategoryLevel2: "",
  },

  onLoad() {
    this.loadTemplates();
  },

  async loadTemplates() {
    this.setData({ templateLoading: true });
    try {
      const templates = await templateService.fetchHomeTemplates(8);
      this.setData({ templates });
    } catch (error) {
      console.warn("[index.loadTemplates] failed", error);
      showError("模板加载失败");
    } finally {
      this.setData({ templateLoading: false });
    }
  },

  handleTemplateSelect(event: WechatMiniprogram.CustomEvent<ScenarioTemplate>) {
    const selected = event.detail;
    this.setData({
      selectedTemplateId: selected.id,
      selectedCategoryLevel1: selected.category_level_1,
      selectedCategoryLevel2: selected.category_level_2,
      inputText: selected.preset_input || selected.title,
    });
  },

  handleInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({
      inputText: event.detail.value,
    });
  },

  handleToneChange(event: WechatMiniprogram.CustomEvent<Tone>) {
    this.setData({
      selectedTone: event.detail,
    });
  },

  handleGenerate() {
    const inputText = this.data.inputText.trim();
    if (!inputText) {
      showError("先输入你的场景");
      return;
    }

    const query = [
      `input=${encodeURIComponent(inputText)}`,
      `tone=${encodeURIComponent(this.data.selectedTone)}`,
      `templateId=${encodeURIComponent(this.data.selectedTemplateId || "")}`,
      `category1=${encodeURIComponent(this.data.selectedCategoryLevel1 || "")}`,
      `category2=${encodeURIComponent(this.data.selectedCategoryLevel2 || "")}`,
    ].join("&");
    wx.navigateTo({
      url: `/pages/result/index?${query}`,
    });
  },
});
